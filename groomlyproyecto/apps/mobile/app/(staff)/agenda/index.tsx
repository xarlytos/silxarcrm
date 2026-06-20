import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GlowCard } from '@/components/ui/GlowCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { AnimatedListItem } from '@/components/ui/AnimatedView';
import { appointmentsService, groomersService, ymd, startOfMonth, endOfMonth } from '@groomly/shared';
import type { Appointment } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/theme/typography';

export default function AgendaPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Appointment['status'] | 'all'>('all');
  const [groomerFilter, setGroomerFilter] = useState<string | 'all'>('all');

  const dateStr = ymd(selectedDate);
  const monthStart = ymd(startOfMonth(selectedDate));
  const monthEnd = ymd(endOfMonth(selectedDate));

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: () =>
      appointmentsService.listAppointments({
        date: dateStr,
        limit: 100,
      }),
  });

  const { data: monthAppointments } = useQuery({
    queryKey: ['appointments-calendar', monthStart, monthEnd],
    queryFn: () =>
      appointmentsService.getCalendar({
        from: monthStart,
        to: monthEnd,
      }),
  });

  const { data: groomersData } = useQuery({
    queryKey: ['groomers-filter'],
    queryFn: () => groomersService.listGroomers(),
  });

  const appointments = data?.data ?? [];
  const groomers = groomersData ?? [];

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (groomerFilter !== 'all' && a.groomerId !== groomerFilter) return false;
    return true;
  });

  // Selector de días (7 días)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 3 + i);
    return d;
  });

  const isSameDay = (d1: Date, d2: Date) => ymd(d1) === ymd(d2);
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const markedDates = monthAppointments?.reduce((acc, appt) => {
    const statusColor =
      appt.status === 'completed'
        ? '#00FF88'
        : appt.status === 'cancelled'
        ? '#FF4D6D'
        : appt.status === 'confirmed'
        ? '#00D4FF'
        : '#FFD740';

    acc[appt.date] = {
      marked: true,
      dotColor: statusColor,
      selected: appt.date === dateStr,
      selectedColor: '#00D4FF',
      selectedTextColor: '#0A0B10',
    };
    return acc;
  }, {} as Record<string, any>) ?? {};

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(new Date(day.dateString));
    setViewMode('list');
  }, []);

  const selectDay = (d: Date) => {
    setSelectedDate(d);
  };

  const formatDateHeader = (d: Date) => {
    const today = ymd(new Date());
    const yesterday = ymd(new Date(Date.now() - 86400000));
    const tomorrow = ymd(new Date(Date.now() + 86400000));
    const dStr = ymd(d);

    if (dStr === today) return 'Hoy';
    if (dStr === yesterday) return 'Ayer';
    if (dStr === tomorrow) return 'Mañana';

    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

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

  function AppointmentCard({ item, index }: { item: Appointment; index: number }) {
    return (
      <AnimatedListItem index={index} animation="slideUp">
        <TouchableOpacity
          onPress={() => router.push(`/(staff)/agenda/${item.id}`)}
          activeOpacity={0.8}
        >
          <Card style={styles.appointmentCard}>
            <View style={styles.appointmentRow}>
              <View style={styles.appointmentTime}>
                <Text style={{ ...typography.h2, color: colors.primary, fontSize: 18 }}>
                  {item.startTime}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  {item.endTime}
                </Text>
              </View>
              <View style={styles.appointmentInfo}>
                <View style={styles.appointmentHeader}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>
                    {item.customer?.fullName}
                  </Text>
                  <StatusBadge status={getStatusType(item.status)} size="sm" />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {item.pet?.name} · {item.services?.map((s) => s.serviceName).join(', ')}
                </Text>
                {item.groomer && (
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                    Peluquero: {item.groomer.name}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </AnimatedListItem>
    );
  }

  const renderItem = ({ item, index }: { item: Appointment; index: number }) => (
    <AppointmentCard item={item} index={index} />
  );

  // Citas en curso
  const inProgressItems = filteredAppointments.filter((a) => a.status === 'in_progress');
  const otherItems = filteredAppointments.filter((a) => a.status !== 'in_progress');

  const s = getStyles(colors);

  return (
    <Screen noPadding>
      <View style={{ paddingHorizontal: 16 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={{ ...typography.h1, color: colors.text, flex: 1 }}>Agenda</Text>
          <View style={s.headerActions}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={s.iconButton}
            >
              <SlidersHorizontal size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              style={s.iconButton}
            >
              <CalendarDays size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(staff)/agenda/new')}
              style={[s.iconButton, s.primaryButton]}
            >
              <Plus size={20} color="#0A0B10" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Selector de días (pills horizontales) */}
        {viewMode === 'list' && (
          <View style={s.daySelector}>
            <TouchableOpacity onPress={() => selectDay(new Date(selectedDate.getTime() - 86400000))} style={s.chevronBtn}>
              <ChevronLeft size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayScroll}>
              <View style={s.dayPills}>
                {weekDays.map((d) => {
                  const isSelected = isSameDay(d, selectedDate);
                  const dayNum = d.getDate();
                  const dayName = dayNames[d.getDay()];
                  return (
                    <TouchableOpacity
                      key={ymd(d)}
                      onPress={() => selectDay(d)}
                      style={[
                        s.dayPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.dayPillName,
                          { color: isSelected ? '#0A0B10' : colors.textMuted },
                        ]}
                      >
                        {dayName}
                      </Text>
                      <Text
                        style={[
                          s.dayPillNum,
                          { color: isSelected ? '#0A0B10' : colors.text },
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity onPress={() => selectDay(new Date(selectedDate.getTime() + 86400000))} style={s.chevronBtn}>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Fecha actual */}
        {viewMode === 'list' && (
          <View style={s.dateHeader}>
            <Text style={{ ...typography.h2, color: colors.text }}>
              {formatDateHeader(selectedDate)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
              {dateStr}
            </Text>
          </View>
        )}

        {/* Calendario */}
        {viewMode === 'calendar' && (
          <View style={[s.calendarContainer, { backgroundColor: colors.surface }]}>
            <Calendar
              current={dateStr}
              onDayPress={handleDayPress}
              markedDates={markedDates}
              theme={{
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#0A0B10',
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                monthTextColor: colors.text,
                textMonthFontWeight: 'bold',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                calendarBackground: colors.surface,
                dayTextColor: colors.text,
                textDisabledColor: colors.textMuted,
                dotColor: colors.primary,
              }}
            />
          </View>
        )}

        {/* Filtros */}
        {showFilters && (
          <GlowCard style={s.filterCard}>
            <View style={s.filterHeader}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Filtros</Text>
              <TouchableOpacity
                onPress={() => { setStatusFilter('all'); setGroomerFilter('all'); }}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Limpiar</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ ...typography.label, color: colors.textMuted, marginBottom: 8 }}>ESTADO</Text>
            <View style={s.filterRow}>
              {[
                { key: 'all' as const, label: 'Todos' },
                { key: 'pending' as const, label: 'Pendiente' },
                { key: 'confirmed' as const, label: 'Confirmada' },
                { key: 'in_progress' as const, label: 'En curso' },
                { key: 'completed' as const, label: 'Completada' },
                { key: 'cancelled' as const, label: 'Cancelada' },
              ].map((s) => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setStatusFilter(s.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: statusFilter === s.key ? colors.primary : colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: statusFilter === s.key ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: statusFilter === s.key ? '#0A0B10' : colors.textSecondary,
                    }}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ ...typography.label, color: colors.textMuted, marginBottom: 8, marginTop: 12 }}>PELUQUERO</Text>
            <View style={s.filterRow}>
              <TouchableOpacity
                onPress={() => setGroomerFilter('all')}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                  backgroundColor: groomerFilter === 'all' ? colors.primary : colors.surfaceElevated,
                  borderWidth: 1, borderColor: groomerFilter === 'all' ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: groomerFilter === 'all' ? '#0A0B10' : colors.textSecondary }}>
                  Todos
                </Text>
              </TouchableOpacity>
              {groomers.filter((g) => g.active).map((g) => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => setGroomerFilter(g.id)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                    backgroundColor: groomerFilter === g.id ? colors.primary : colors.surfaceElevated,
                    borderWidth: 1, borderColor: groomerFilter === g.id ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: groomerFilter === g.id ? '#0A0B10' : colors.textSecondary }}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlowCard>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Total', value: filteredAppointments.length, color: colors.primary },
            { label: 'Hechas', value: filteredAppointments.filter((a) => a.status === 'completed').length, color: '#00FF88' },
            { label: 'Pendientes', value: filteredAppointments.filter((a) => a.status === 'confirmed' || a.status === 'pending').length, color: colors.accent },
          ].map((stat) => (
            <GlowCard key={stat.label} glowColor={`${stat.color}15`} style={s.statCard}>
              <View style={s.statContent}>
                <Text style={{ ...typography.score, color: stat.color, fontSize: 20 }}>
                  {stat.value}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '500', marginTop: 2 }}>
                  {stat.label}
                </Text>
              </View>
            </GlowCard>
          ))}
        </View>
      </View>

      {/* Lista de citas */}
      {isLoading ? (
        <View style={s.center}>
          <Text style={{ color: colors.textMuted }}>Cargando citas...</Text>
        </View>
      ) : filteredAppointments.length === 0 ? (
        <View style={s.centerEmpty}>
          <EmptyState
            image={require('../../../assets/images/empty-citas.png')}
            title="No hay citas"
            subtitle="Este día está libre en tu agenda."
            actionLabel="Nueva cita"
            onAction={() => router.push('/(staff)/agenda/new')}
          />
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          ListHeaderComponent={inProgressItems.length > 0 ? (
            <View style={s.inProgressSection}>
              <SectionHeader title="En curso" dotColor="#00FF88" />
              {inProgressItems.map((item, idx) => (
                <AppointmentCard key={item.id} item={item} index={idx} />
              ))}
            </View>
          ) : undefined}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  appointmentCard: {
    marginBottom: 10,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  appointmentTime: {
    alignItems: 'center',
    marginRight: 16,
    width: 52,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});

function getStyles(colors: any) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    headerActions: {
      flexDirection: 'row',
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      marginRight: 0,
    },
    daySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    chevronBtn: {
      padding: 4,
    },
    dayScroll: {
      flex: 1,
    },
    dayPills: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 4,
    },
    dayPill: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      minWidth: 52,
    },
    dayPillName: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dayPillNum: {
      fontSize: 16,
      fontWeight: '800',
      marginTop: 2,
    },
    dateHeader: {
      marginBottom: 16,
    },
    calendarContainer: {
      marginBottom: 16,
      borderRadius: 16,
      padding: 8,
    },
    filterCard: {
      marginBottom: 16,
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
    },
    statContent: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    inProgressSection: {
      marginBottom: 16,
    },
  });
}
