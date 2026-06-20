import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  MapPin,
  FileText,
  PawPrint,
  Calendar,
  Trash2,
  ChevronRight,
  Pencil,
} from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { customersService } from '@groomly/shared';
import type { Customer, Pet, Appointment } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function ClienteDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'info' | 'pets' | 'appointments'>('info');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersService.getCustomer(id as string),
  });

  const { data: pets } = useQuery({
    queryKey: ['customer-pets', id],
    queryFn: () => customersService.getCustomerPets(id as string),
    enabled: activeTab === 'pets',
  });

  const { data: appointments } = useQuery({
    queryKey: ['customer-appointments', id],
    queryFn: () => customersService.getCustomerAppointments(id as string),
    enabled: activeTab === 'appointments',
  });

  const archiveMutation = useMutation({
    mutationFn: () => customersService.archiveCustomer(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.back();
    },
  });

  const handleArchive = () => {
    Alert.alert(
      'Archivar cliente',
      `¿Estás seguro de archivar a ${customer?.fullName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: () => archiveMutation.mutate(),
        },
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { bg: `${colors.success}18`, text: colors.success, label: 'Completada' };
      case 'cancelled': return { bg: `${colors.error}18`, text: colors.error, label: 'Cancelada' };
      case 'confirmed': return { bg: `${colors.primary}18`, text: colors.primary, label: 'Confirmada' };
      default: return { bg: `${colors.warning}18`, text: colors.warning, label: 'Pendiente' };
    }
  };

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Cargando...</Text>
      </Screen>
    );
  }

  if (!customer) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Cliente no encontrado</Text>
      </Screen>
    );
  }

  const tabs = [
    { key: 'info' as const, label: 'Info' },
    { key: 'pets' as const, label: 'Mascotas' },
    { key: 'appointments' as const, label: 'Citas' },
  ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}12` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {customer.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{customer.fullName}</Text>
          {customer.loyaltyPoints > 0 && (
            <Text style={[styles.loyalty, { color: colors.primary }]}>
              {customer.loyaltyPoints} puntos de fidelidad
            </Text>
          )}
          <TouchableOpacity
            onPress={() => router.push(`/(staff)/clientes/${id}/edit`)}
            style={[styles.editButton, { backgroundColor: `${colors.primary}10` }]}
          >
            <Pencil size={14} color={colors.primary} />
            <Text style={[styles.editText, { color: colors.primary }]}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.surfaceHighlight }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? colors.primary : colors.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <Card>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Contacto</Text>
              {customer.phone && (
                <View style={styles.contactRow}>
                  <Phone size={18} color={colors.textSecondary} />
                  <Text style={[styles.contactText, { color: colors.text }]}>{customer.phone}</Text>
                </View>
              )}
              {customer.email && (
                <View style={styles.contactRow}>
                  <Mail size={18} color={colors.textSecondary} />
                  <Text style={[styles.contactText, { color: colors.text }]}>{customer.email}</Text>
                </View>
              )}
              {(customer.address || customer.city) && (
                <View style={styles.contactRow}>
                  <MapPin size={18} color={colors.textSecondary} />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {[customer.address, customer.city].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </Card>

            {customer.notes && (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Notas</Text>
                <View style={styles.row}>
                  <FileText size={18} color={colors.textSecondary} />
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>{customer.notes}</Text>
                </View>
              </Card>
            )}

            <Button variant="outline" onPress={handleArchive} style={{ marginTop: 16 }}>
              <View style={styles.row}>
                <Trash2 size={16} color={colors.error} />
                <Text style={[styles.archiveText, { color: colors.error }]}>Archivar cliente</Text>
              </View>
            </Button>
          </View>
        )}

        {activeTab === 'pets' && (
          <View style={styles.tabContent}>
            {pets?.length === 0 ? (
              <Card style={styles.emptyCard}>
                <PawPrint size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tiene mascotas registradas</Text>
              </Card>
            ) : (
              pets?.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() => router.push(`/(staff)/mascotas/${pet.id}`)}
                >
                  <Card style={styles.petCard}>
                    <View style={styles.row}>
                      <View style={[styles.petAvatar, { backgroundColor: `${colors.primary}12` }]}>
                        <Text style={[styles.petAvatarText, { color: colors.primary }]}>
                          {pet.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.infoCol}>
                        <Text style={[styles.petName, { color: colors.text }]}>{pet.name}</Text>
                        <Text style={[styles.petDetail, { color: colors.textMuted }]}>
                          {pet.breed} · {pet.size}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'appointments' && (
          <View style={styles.tabContent}>
            {appointments?.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Calendar size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tiene citas registradas</Text>
              </Card>
            ) : (
              appointments?.map((appt) => {
                const status = getStatusStyle(appt.status);
                return (
                  <Card key={appt.id} style={styles.appointmentCard}>
                    <View style={styles.appointmentRow}>
                      <View>
                        <Text style={[styles.appointmentDate, { color: colors.text }]}>
                          {appt.date} · {appt.startTime}
                        </Text>
                        <Text style={[styles.appointmentDetail, { color: colors.textMuted }]}>
                          {appt.pet?.name} · {appt.services?.map((s) => s.serviceName).join(', ')}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  loyalty: {
    fontSize: 13,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  editText: {
    fontWeight: '500',
    marginLeft: 8,
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontWeight: '500',
    fontSize: 13,
  },
  tabContent: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  archiveText: {
    marginLeft: 8,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  petCard: {
    marginBottom: 8,
  },
  petAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  petAvatarText: {
    fontWeight: '700',
    fontSize: 16,
  },
  infoCol: {
    flex: 1,
  },
  petName: {
    fontSize: 15,
    fontWeight: '500',
  },
  petDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  appointmentCard: {
    marginBottom: 8,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
