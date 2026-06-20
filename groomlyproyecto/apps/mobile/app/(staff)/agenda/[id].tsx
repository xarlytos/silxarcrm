import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, User, PawPrint, Scissors, FileText, Trash2, Pencil } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { appointmentsService, extractErrorMessage } from '@groomly/shared';
import type { Appointment } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function AppointmentDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsService.getAppointment(id as string),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: Appointment['status']; reason?: string }) =>
      appointmentsService.updateAppointmentStatus(id as string, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => appointmentsService.cancelAppointment(id as string, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      router.back();
    },
  });

  const handleComplete = () => {
    updateStatusMutation.mutate({ status: 'completed' });
  };

  const handleCancel = () => {
    Alert.alert('Cancelar cita', '¿Estás seguro?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(undefined),
      },
    ]);
  };

  const handleConfirm = () => {
    updateStatusMutation.mutate({ status: 'confirmed' });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: `${colors.textMuted}18`, text: colors.textMuted, label: 'Pendiente' };
      case 'confirmed': return { bg: `${colors.primary}18`, text: colors.primary, label: 'Confirmada' };
      case 'in_progress': return { bg: `${colors.warning}18`, text: colors.warning, label: 'En progreso' };
      case 'completed': return { bg: `${colors.success}18`, text: colors.success, label: 'Completada' };
      case 'cancelled': return { bg: `${colors.error}18`, text: colors.error, label: 'Cancelada' };
      case 'no_show': return { bg: `${colors.error}18`, text: colors.error, label: 'No show' };
      default: return { bg: `${colors.textMuted}18`, text: colors.textMuted, label: 'Pendiente' };
    }
  };

  const s = getStatusStyle(appointment?.status || 'pending');
  const canEdit = ['pending', 'confirmed'].includes(appointment?.status || '');

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Cargando...</Text>
      </Screen>
    );
  }

  if (!appointment) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Cita no encontrada</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
          </View>
          {canEdit && (
            <TouchableOpacity
              onPress={() => router.push(`/(staff)/agenda/${id}/edit`)}
              style={[styles.editButton, { backgroundColor: `${colors.primary}10` }]}
            >
              <Pencil size={14} color={colors.primary} />
              <Text style={[styles.editText, { color: colors.primary }]}>Editar cita</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Time card */}
        <Card style={styles.card}>
          <View style={styles.row}>
            <Clock size={20} color={colors.textSecondary} />
            <View style={styles.timeInfo}>
              <Text style={[styles.timeDate, { color: colors.text }]}>{appointment.date}</Text>
              <Text style={[styles.timeRange, { color: colors.textSecondary }]}>
                {appointment.startTime} — {appointment.endTime}
              </Text>
            </View>
          </View>
        </Card>

        {/* Client & Pet */}
        <Card style={styles.card}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Cliente y mascota</Text>
          <View style={styles.personRow}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}12` }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {appointment.customer?.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.name, { color: colors.text }]}>{appointment.customer?.fullName}</Text>
              <Text style={[styles.detail, { color: colors.textSecondary }]}>{appointment.customer?.phone}</Text>
            </View>
          </View>
          <View style={styles.personRow}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}12` }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {appointment.pet?.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.name, { color: colors.text }]}>{appointment.pet?.name}</Text>
              <Text style={[styles.detail, { color: colors.textSecondary }]}>
                {appointment.pet?.breed} · {appointment.pet?.size}
              </Text>
            </View>
          </View>
        </Card>

        {/* Services */}
        <Card style={styles.card}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Servicios</Text>
          {appointment.services?.map((service) => (
            <View key={service.id} style={[styles.serviceRow, { borderBottomColor: colors.border }]}>
              <View style={styles.row}>
                <Scissors size={16} color={colors.textSecondary} />
                <Text style={[styles.serviceName, { color: colors.text }]}>{service.serviceName}</Text>
                {service.addonName && (
                  <Text style={[styles.addonName, { color: colors.textMuted }]}>+ {service.addonName}</Text>
                )}
              </View>
              <Text style={[styles.price, { color: colors.text }]}>{service.price}€</Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalPrice, { color: colors.primary }]}>{appointment.totalPrice}€</Text>
          </View>
        </Card>

        {/* Groomer */}
        {appointment.groomer && (
          <Card style={styles.card}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Peluquero</Text>
            <View style={styles.row}>
              <View style={[styles.groomerDot, { backgroundColor: appointment.groomer.color || colors.primary }]} />
              <Text style={[styles.groomerName, { color: colors.text }]}>{appointment.groomer.name}</Text>
            </View>
          </Card>
        )}

        {/* Notes */}
        {appointment.notes && (
          <Card style={styles.card}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Notas del cliente</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{appointment.notes}</Text>
          </Card>
        )}

        {appointment.internalNotes && (
          <Card style={styles.card}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Notas internas</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{appointment.internalNotes}</Text>
          </Card>
        )}

        {/* Actions */}
        {canEdit && (
          <View style={styles.actions}>
            {appointment.status === 'pending' && (
              <Button onPress={handleConfirm}>
                <View style={styles.row}>
                  <Check size={18} color="#fff" />
                  <Text style={styles.actionTextWhite}>Confirmar cita</Text>
                </View>
              </Button>
            )}
            {appointment.status === 'confirmed' && (
              <Button onPress={handleComplete}>
                <View style={styles.row}>
                  <Check size={18} color="#fff" />
                  <Text style={styles.actionTextWhite}>Completar cita</Text>
                </View>
              </Button>
            )}
            <Button variant="outline" onPress={handleCancel}>
              <View style={styles.row}>
                <X size={18} color={colors.error} />
                <Text style={[styles.actionTextRed, { color: colors.error }]}>Cancelar cita</Text>
              </View>
            </Button>
          </View>
        )}

        {!canEdit && appointment.status === 'completed' && (
          <Card style={[styles.completedCard, { backgroundColor: `${colors.success}10` }]}>
            <Text style={[styles.completedText, { color: colors.success }]}>✅ Cita completada</Text>
          </Card>
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
  statusSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 16,
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
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInfo: {
    marginLeft: 12,
  },
  timeDate: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeRange: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 16,
  },
  infoCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  serviceName: {
    marginLeft: 8,
    fontSize: 14,
  },
  addonName: {
    fontSize: 13,
    marginLeft: 4,
  },
  price: {
    fontWeight: '500',
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  totalPrice: {
    fontWeight: '700',
    fontSize: 20,
  },
  groomerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  groomerName: {
    fontSize: 15,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  actionTextWhite: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  actionTextRed: {
    fontWeight: '500',
    marginLeft: 8,
  },
  completedCard: {
    marginBottom: 24,
  },
  completedText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
