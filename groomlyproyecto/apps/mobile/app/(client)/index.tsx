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
import { AvatarStack } from '@/components/ui/AvatarStack';
import { useAuth } from '@/hooks/useAuth';
import {
  Calendar,
  PawPrint,
  Star,
  LogOut,
  ChevronRight,
  MapPin,
  Phone,
} from 'lucide-react-native';
import { appointmentsService, petsService } from '@groomly/shared';
import { AnimatedListItem } from '@/components/ui/AnimatedView';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';

const DEFAULT_PET_AVATAR = require('../../assets/images/avatar-default-pet.png');
const HERO_IMAGE = require('../../assets/images/hero-cita-default.png');

export default function ClientDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const { data: myAppointments } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentsService.listAppointments({ limit: 10 }),
    enabled: !!user,
  });

  const { data: myPets } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => petsService.listPets({ limit: 10 }),
    enabled: !!user,
  });

  const appointments = myAppointments?.data ?? [];
  const pets = myPets?.data ?? [];
  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'confirmed'
  );

  const nextAppointment = upcomingAppointments[0];

  const getStatusType = (status: string): 'confirmada' | 'enCurso' | 'pendiente' | 'cancelada' | 'completada' => {
    switch (status) {
      case 'confirmed': return 'confirmada';
      case 'in_progress': return 'enCurso';
      case 'pending': return 'pendiente';
      case 'cancelled': return 'cancelada';
      case 'completed': return 'completada';
      default: return 'pendiente';
    }
  };

  return (
    <Screen noPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={{ ...typography.label, color: colors.primary, textTransform: 'uppercase' }}>
              HOLA
            </Text>
            <Text style={{ ...typography.h1, color: colors.text, marginTop: 2 }}>
              {user?.firstName || 'Cliente'}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <LogOut size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Hero — Próxima cita */}
        {nextAppointment ? (
          <HeroCard
            title={`${nextAppointment.pet?.name || 'Mascota'}`}
            subtitle={`${nextAppointment.services?.map((s) => s.serviceName).join(', ')}`}
            time={`${nextAppointment.startTime} · ${nextAppointment.date}`}
            status={getStatusType(nextAppointment.status)}
            imageSource={HERO_IMAGE}
            actionLabel="Ver detalles"
            onActionPress={() => router.push(`/(staff)/agenda/${nextAppointment.id}`)}
          />
        ) : (
          <EmptyState
            image={require('../../assets/images/empty-citas.png')}
            title="No tienes citas pendientes"
            subtitle="Reserva tu próxima visita y mantén a tu mascota siempre hermosa."
            actionLabel="Reservar cita"
            onAction={() => router.push('/(client)/citas')}
          />
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <GlowCard glowColor={`${colors.primary}15`} style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={{ ...typography.score, color: colors.primary, fontSize: 28 }}>
                {upcomingAppointments.length}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, fontWeight: '500' }}>
                Próximas
              </Text>
            </View>
          </GlowCard>
          <GlowCard glowColor={`${colors.accent}15`} style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={{ ...typography.score, color: colors.accent, fontSize: 28 }}>
                {pets.length}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, fontWeight: '500' }}>
                Mascotas
              </Text>
            </View>
          </GlowCard>
          <GlowCard glowColor={`${colors.success}15`} style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={{ ...typography.score, color: colors.success, fontSize: 28 }}>
                {appointments.filter((a) => a.status === 'completed').length}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, fontWeight: '500' }}>
                Visitas
              </Text>
            </View>
          </GlowCard>
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Acciones" />
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => router.push('/(client)/citas')}
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}12` }]}>
              <Calendar size={22} color={colors.primary} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>Reservar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(client)/mascotas')}
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${colors.accent}12` }]}>
              <PawPrint size={22} color={colors.accent} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>Mascotas</Text>
          </TouchableOpacity>
        </View>

        {/* Próximas citas */}
        <SectionHeader
          title="Próximas citas"
          action={{ label: 'Ver todas', onPress: () => router.push('/(client)/citas') }}
        />

        {upcomingAppointments.length === 0 ? (
          <EmptyState
            image={require('../../assets/images/empty-citas.png')}
            title="No tienes citas pendientes"
            subtitle="Tu calendario está libre."
            actionLabel="Reservar ahora"
            onAction={() => router.push('/(client)/citas')}
          />
        ) : (
          <View style={styles.listSection}>
            {upcomingAppointments.slice(0, 3).map((appt, idx) => (
              <AnimatedListItem key={appt.id} index={idx} animation="slideUp">
                <TouchableOpacity
                  onPress={() => router.push(`/(staff)/agenda/${appt.id}`)}
                  activeOpacity={0.8}
                >
                  <Card style={styles.appointmentCard}>
                    <View style={styles.appointmentTime}>
                      <Text style={{ ...typography.h2, color: colors.primary, fontSize: 18 }}>
                        {appt.startTime}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                        {appt.date}
                      </Text>
                    </View>
                    <View style={styles.appointmentInfo}>
                      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>
                        {appt.pet?.name}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                        {appt.services?.map((s) => s.serviceName).join(', ')}
                      </Text>
                    </View>
                    <StatusBadge status={getStatusType(appt.status)} size="sm" />
                  </Card>
                </TouchableOpacity>
              </AnimatedListItem>
            ))}
          </View>
        )}

        {/* Mis mascotas */}
        {pets.length > 0 && (
          <>
            <SectionHeader title="Mis mascotas" />
            <View style={styles.petsRow}>
              {pets.slice(0, 3).map((pet, idx) => (
                <AnimatedListItem key={pet.id} index={idx} animation="scale">
                  <TouchableOpacity
                    onPress={() => router.push(`/(staff)/mascotas/${pet.id}`)}
                    style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={[styles.petAvatar, { backgroundColor: `${colors.primary}12` }]}>
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 20 }}>
                        {pet.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                      {pet.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {pet.breed}
                    </Text>
                  </TouchableOpacity>
                </AnimatedListItem>
              ))}
            </View>
          </>
        )}

        {/* Valoraciones */}
        <SectionHeader title="Valoraciones" />
        <GlowCard style={styles.ratingCard}>
          <Star size={40} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 12, textAlign: 'center', fontSize: 15 }}>
            Valora tu última visita{'\n'}y ayuda a mejorar el servicio
          </Text>
        </GlowCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  logoutBtn: {
    padding: 8,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  listSection: {
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
  appointmentInfo: {
    flex: 1,
  },
  petsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  petCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 100,
  },
  petAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ratingCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
});
