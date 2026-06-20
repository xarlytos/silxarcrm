import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { appointmentsService, ymd } from '@groomly/shared';
import { Calendar, Plus, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function ClientCitasPage() {
  const router = useRouter();
  const { colors } = useTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-appointments-list'],
    queryFn: () => appointmentsService.listAppointments({ limit: 50 }),
  });

  const appointments = data?.data ?? [];
  const upcoming = appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  const past = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: `${colors.success}18`, text: colors.success, label: 'Completada' };
      case 'cancelled':
        return { bg: `${colors.error}18`, text: colors.error, label: 'Cancelada' };
      case 'confirmed':
        return { bg: `${colors.primary}18`, text: colors.primary, label: 'Confirmada' };
      default:
        return { bg: `${colors.warning}18`, text: colors.warning, label: 'Pendiente' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = getStatusStyle(item.status);

    return (
      <TouchableOpacity onPress={() => router.push(`/(staff)/agenda/${item.id}`)}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.timeCol}>
              <Text style={[styles.timeText, { color: colors.primary }]}>{item.startTime}</Text>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>{item.date}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.petName, { color: colors.text }]}>{item.pet?.name}</Text>
              <Text style={[styles.serviceText, { color: colors.textSecondary }]}>
                {item.services?.map((s: any) => s.serviceName).join(', ')}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} style={styles.chevron} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Mis citas</Text>
        <TouchableOpacity
          onPress={() => router.push('/(staff)/agenda/new')}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Cargando...</Text>
        </View>
      ) : appointments.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Calendar size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No tienes citas programadas{'\n'}Reserva tu próxima visita
          </Text>
          <TouchableOpacity onPress={() => router.push('/(staff)/agenda/new')}>
            <Text style={[styles.emptyAction, { color: colors.primary }]}>Reservar ahora</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <FlatList
          data={[...upcoming, ...past]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  emptyAction: {
    marginTop: 16,
    fontWeight: '500',
    fontSize: 14,
  },
  card: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeCol: {
    width: 56,
    alignItems: 'center',
    marginRight: 12,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
  },
  petName: {
    fontSize: 15,
    fontWeight: '500',
  },
  serviceText: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 8,
  },
});
