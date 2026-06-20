import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { HeroCard } from '@/components/ui/HeroCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StoryCircle } from '@/components/ui/StoryCircle';
import { GlowCard } from '@/components/ui/GlowCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MenuDrawer } from '@/components/ui/MenuDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useSalon } from '@/hooks/useSalon';
import {
  Calendar,
  Users,
  PawPrint,
  DollarSign,
  LogOut,
  Bell,
  ChevronRight,
  Menu,
} from 'lucide-react-native';
import { appointmentsService, notificationsService } from '@groomly/shared';
import { AnimatedListItem } from '@/components/ui/AnimatedView';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { ymd } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';
import { useState } from 'react';

const DEFAULT_PET_AVATAR = require('../../assets/images/avatar-default-pet.png');
const HERO_IMAGE = require('../../assets/images/hero-cita-default.png');

export default function StaffDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { currentSalon } = useSalon();
  const { colors } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const today = ymd(new Date());

  const { data: todayAppointments } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: () => appointmentsService.listAppointments({ date: today, limit: 20 }),
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsService.getUnreadSummary(),
    refetchInterval: 30000,
  });

  const appointments = todayAppointments?.data ?? [];
  const pendingAppointments = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'confirmed'
  );
  const completedAppointments = appointments.filter((a) => a.status === 'completed');
  const inProgressAppointments = appointments.filter((a) => a.status === 'in_progress');

  const todayRevenue = completedAppointments.reduce((sum, a) => sum + a.totalPrice, 0);

  const nextAppointment = [...inProgressAppointments, ...pendingAppointments][0];
  const storyAppointments = pendingAppointments.slice(0, 5);

  const quickActions = [
    { icon: Calendar, label: 'Nueva cita', onPress: () => router.push('/(staff)/agenda/new') },
    { icon: Users, label: 'Cliente', onPress: () => router.push('/(staff)/clientes/new') },
    { icon: PawPrint, label: 'Mascota', onPress: () => router.push('/(staff)/mascotas/new') },
    { icon: DollarSign, label: 'Finanzas', onPress: () => router.push('/(staff)/finanzas') },
  ];

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const getStatusType = (status: string) => {
    switch (status) {
      case 'confirmed': return 'confirmada';
      case 'in_progress': return 'enCurso';
      case 'pending': return 'pendiente';
      case 'cancelled': return 'cancelada';
      case 'completed': return 'completada';
      default: return 'pendiente';
    }
  };

  const s = getStyles(colors);

  if (!todayAppointments && !unreadCount) {
    return (
      <Screen>
        <SkeletonDashboard />
      </Screen>
    );
  }

  return (
    <Screen noPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <TouchableOpacity style={s.iconButton} onPress={() => setDrawerOpen(true)}>
              <Menu size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={s.headerTitle}>
              <Text style={[typography.label, s.brandText, { color: colors.primary }]}>
                GROOMLY
              </Text>
              <Text style={[s.salonName, { color: colors.textMuted }]}>
                {currentSalon?.name || 'Mi salón'}
              </Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              onPress={() => router.push('/(staff)/notificaciones')}
              style={s.iconButton}
            >
              <Bell size={22} color={colors.textSecondary} />
              {unreadCount ? (
                <View style={[s.badge, { backgroundColor: colors.error, borderColor: colors.background }]}>
                  <Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={s.iconButton}>
              <LogOut size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        {nextAppointment ? (
          <HeroCard
            title={nextAppointment.pet?.name || 'Mascota'}
            subtitle={`${nextAppointment.customer?.fullName || 'Cliente'} · ${nextAppointment.services?.map((s) => s.serviceName).join(', ')}`}
            time={`${nextAppointment.startTime} — ${nextAppointment.date}`}
            status={getStatusType(nextAppointment.status)}
            imageSource={HERO_IMAGE}
            actionLabel={nextAppointment.status === 'in_progress' ? 'Ver progreso' : 'Comenzar'}
            onActionPress={() => router.push(`/(staff)/agenda/${nextAppointment.id}`)}
          />
        ) : (
          <GlowCard glowColor={colors.primaryGlow} style={s.heroEmpty}>
            <View style={s.heroEmptyContent}>
              <Calendar size={40} color={colors.textMuted} />
              <Text style={[s.heroEmptyText, { color: colors.textSecondary }]}>
                No hay citas pendientes hoy
              </Text>
              <GradientButton
                size="sm"
                onPress={() => router.push('/(staff)/agenda/new')}
                style={s.heroEmptyButton}
              >
                Nueva cita
              </GradientButton>
            </View>
          </GlowCard>
        )}

        {/* Stories */}
        {storyAppointments.length > 0 && (
          <View style={s.storiesSection}>
            <Text style={[typography.label, s.storiesLabel, { color: colors.textMuted }]}>
              PRÓXIMAS CITAS
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {storyAppointments.map((appt, i) => (
                <StoryCircle
                  key={appt.id}
                  image={DEFAULT_PET_AVATAR}
                  label={appt.pet?.name || '?'}
                  isActive={i === 0}
                  onPress={() => router.push(`/(staff)/agenda/${appt.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          <GlowCard glowColor={`${colors.primary}15`} style={s.statCard}>
            <View style={s.statContent}>
              <Text style={[typography.score, s.statNumber, { color: colors.primary, fontSize: 32 }]}>
                {pendingAppointments.length}
              </Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Pendientes</Text>
            </View>
          </GlowCard>
          <GlowCard glowColor={`${colors.success}15`} style={s.statCard}>
            <View style={s.statContent}>
              <Text style={[typography.score, s.statNumber, { color: colors.success, fontSize: 32 }]}>
                {completedAppointments.length}
              </Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Completadas</Text>
            </View>
          </GlowCard>
          <GlowCard glowColor={`${colors.accent}15`} style={s.statCard}>
            <View style={s.statContent}>
              <Text style={[typography.score, s.statNumber, { color: colors.accent, fontSize: 24 }]}>
                {formatCurrency(todayRevenue)}
              </Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Ingresos</Text>
            </View>
          </GlowCard>
        </View>

        {/* Quick Actions */}
        <SectionHeader
          title="Acciones rápidas"
          action={{ label: 'Ver más', onPress: () => router.push('/(staff)/mas') }}
        />
        <View style={s.actionsGrid}>
          {quickActions.map((action, i) => (
            <AnimatedListItem key={i} index={i} animation="scale">
              <TouchableOpacity
                onPress={action.onPress}
                style={[
                  s.actionButton,
                  i % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 },
                ]}
              >
                <View style={[s.actionIcon, { backgroundColor: `${colors.primary}12` }]}>
                  <action.icon size={22} color={colors.primary} />
                </View>
                <Text style={[s.actionLabel, { color: colors.textSecondary }]}>{action.label}</Text>
              </TouchableOpacity>
            </AnimatedListItem>
          ))}
        </View>

        {/* Citas de hoy */}
        <SectionHeader
          title="Citas de hoy"
          action={{ label: 'Ver agenda', onPress: () => router.push('/(staff)/agenda') }}
        />

        {appointments.length === 0 ? (
          <EmptyState
            image={require('../../assets/images/empty-citas.png')}
            title="No hay citas hoy"
            subtitle="Tu agenda está libre. Aprovecha para organizar tu día."
            actionLabel="Crear cita"
            onAction={() => router.push('/(staff)/agenda/new')}
          />
        ) : (
          <View style={s.appointmentsList}>
            {appointments.map((appt, idx) => (
              <AnimatedListItem key={appt.id} index={idx} animation="slideUp">
                <TouchableOpacity
                  onPress={() => router.push(`/(staff)/agenda/${appt.id}`)}
                  activeOpacity={0.8}
                >
                  <Card style={s.appointmentCard}>
                    <View style={s.appointmentTime}>
                      <Text style={[typography.h2, s.appointmentTimeText, { color: colors.primary }]}>
                        {appt.startTime}
                      </Text>
                      <Text style={[s.appointmentEndTime, { color: colors.textMuted }]}>
                        {appt.endTime}
                      </Text>
                    </View>
                    <View style={s.appointmentInfo}>
                      <Text style={[s.appointmentName, { color: colors.text }]}>
                        {appt.customer?.fullName}
                      </Text>
                      <Text style={[s.appointmentService, { color: colors.textSecondary }]}>
                        {appt.pet?.name} · {appt.services?.map((s) => s.serviceName).join(', ')}
                      </Text>
                    </View>
                    <StatusBadge status={getStatusType(appt.status)} size="sm" />
                  </Card>
                </TouchableOpacity>
              </AnimatedListItem>
            ))}
          </View>
        )}

        {/* Notificaciones */}
        {unreadCount ? (
          <View style={s.notificationsSection}>
            <SectionHeader title="Notificaciones" />
            <TouchableOpacity
              onPress={() => router.push('/(staff)/notificaciones')}
              activeOpacity={0.8}
            >
              <Card style={s.notificationCard}>
                <View style={[s.notificationIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Bell size={20} color={colors.primary} />
                </View>
                <View style={s.notificationText}>
                  <Text style={[s.notificationTitle, { color: colors.text }]}>
                    Tienes {unreadCount} notificación{unreadCount > 1 ? 'es' : ''} sin leer
                  </Text>
                  <Text style={[s.notificationSubtitle, { color: colors.textMuted }]}>
                    Toca para verlas
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </Card>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
      <MenuDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Screen>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 4,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      padding: 8,
    },
    headerTitle: {
      marginLeft: 8,
    },
    brandText: {
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    salonName: {
      fontSize: 12,
      marginTop: 2,
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      borderRadius: 999,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    heroEmpty: {
      marginBottom: 16,
    },
    heroEmptyContent: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    heroEmptyText: {
      marginTop: 12,
      fontSize: 15,
    },
    heroEmptyButton: {
      marginTop: 16,
      minWidth: 180,
    },
    storiesSection: {
      marginBottom: 24,
    },
    storiesLabel: {
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
    },
    statContent: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    statNumber: {
      marginTop: 4,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 24,
    },
    actionButton: {
      width: '47%',
      alignItems: 'center',
      paddingVertical: 20,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    actionLabel: {
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.textSecondary,
    },
    appointmentsList: {
      marginBottom: 24,
    },
    appointmentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    appointmentTime: {
      alignItems: 'center',
      marginRight: 16,
    },
    appointmentTimeText: {
      fontSize: 18,
    },
    appointmentEndTime: {
      fontSize: 11,
      marginTop: 2,
    },
    appointmentInfo: {
      flex: 1,
    },
    appointmentName: {
      fontWeight: '600',
      fontSize: 15,
    },
    appointmentService: {
      fontSize: 13,
      marginTop: 2,
    },
    notificationsSection: {
      marginBottom: 24,
    },
    notificationCard: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    notificationIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    notificationText: {
      flex: 1,
    },
    notificationTitle: {
      fontWeight: '600',
      fontSize: 15,
    },
    notificationSubtitle: {
      fontSize: 13,
      marginTop: 2,
    },
  });
}
