import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Calendar, Clock, ChevronDown, Scissors } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { appointmentsService, groomersService, servicesService, extractErrorMessage, priceForSize, ymd } from '@groomly/shared';
import type { Appointment } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function EditAppointmentPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsService.getAppointment(id as string),
  });

  const { data: groomersData } = useQuery({
    queryKey: ['groomers-edit'],
    queryFn: () => groomersService.listGroomers(),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services-edit'],
    queryFn: () => servicesService.listServices(),
  });

  const [selectedGroomerId, setSelectedGroomerId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Array<{ serviceId: string; addonId?: string }>>([]);
  const [showGroomerPicker, setShowGroomerPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (appointment) {
      setSelectedGroomerId(appointment.groomerId);
      setSelectedServices(appointment.services?.map(s => ({ serviceId: s.serviceId, addonId: s.addonId ?? undefined })) ?? []);
    }
  }, [appointment]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof appointmentsService.updateAppointment>[1]) =>
      appointmentsService.updateAppointment(id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      router.back();
    },
    onError: (err) => {
      setErrors({ general: extractErrorMessage(err) });
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate({
      groomerId: selectedGroomerId,
      services: selectedServices,
    });
  };

  const toggleService = (serviceId: string, addonId?: string) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.serviceId === serviceId && s.addonId === addonId);
      if (exists) {
        return prev.filter((s) => !(s.serviceId === serviceId && s.addonId === addonId));
      }
      return [...prev, { serviceId, addonId }];
    });
  };

  const groomers = groomersData ?? [];
  const services = servicesData ?? [];

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
        <Text style={[styles.title, { color: colors.text }]}>Editar cita</Text>

        {errors.general && (
          <Text style={[styles.error, { color: colors.error }]}>{errors.general}</Text>
        )}

        {/* Info readonly */}
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Información</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>Cliente: {appointment.customer?.fullName}</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>Mascota: {appointment.pet?.name}</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>Fecha: {appointment.date} · {appointment.startTime}</Text>
        </View>

        {/* Groomer selector */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Peluquero</Text>
          <TouchableOpacity
            onPress={() => setShowGroomerPicker(!showGroomerPicker)}
            style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.selectorText, { color: colors.text }]}>
              {selectedGroomerId
                ? groomers.find((g) => g.id === selectedGroomerId)?.name ?? 'Cualquiera'
                : 'Cualquiera disponible'}
            </Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </TouchableOpacity>
          {showGroomerPicker && (
            <View style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedGroomerId(null);
                  setShowGroomerPicker(false);
                }}
                style={[styles.pickerItem, !selectedGroomerId && { backgroundColor: `${colors.primary}10` }]}
              >
                <Text style={{ color: !selectedGroomerId ? colors.primary : colors.text }}>
                  Cualquiera disponible
                </Text>
              </TouchableOpacity>
              {groomers.filter((g) => g.active).map((g) => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => {
                    setSelectedGroomerId(g.id);
                    setShowGroomerPicker(false);
                  }}
                  style={[styles.pickerItem, selectedGroomerId === g.id && { backgroundColor: `${colors.primary}10` }]}
                >
                  <Text style={{ color: selectedGroomerId === g.id ? colors.primary : colors.text }}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Services */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Servicios</Text>
        <View style={styles.servicesList}>
          {services
            .filter((s) => s.active)
            .map((service) => (
              <View key={service.id}>
                <TouchableOpacity onPress={() => toggleService(service.id)}>
                  <View
                    style={[
                      styles.serviceItem,
                      {
                        backgroundColor: selectedServices.some((s) => s.serviceId === service.id && !s.addonId)
                          ? `${colors.primary}10`
                          : colors.surface,
                        borderColor: selectedServices.some((s) => s.serviceId === service.id && !s.addonId)
                          ? colors.primary
                          : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.row}>
                      <View style={styles.row}>
                        <View style={[styles.serviceDot, { backgroundColor: service.color || colors.primary }]} />
                        <View>
                          <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
                          <Text style={[styles.serviceDetail, { color: colors.textMuted }]}>{service.durationMinutes} min</Text>
                        </View>
                      </View>
                      {selectedServices.some((s) => s.serviceId === service.id && !s.addonId) && (
                        <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                {service.addons?.map((addon) => (
                  <TouchableOpacity
                    key={addon.id}
                    onPress={() => toggleService(service.id, addon.id)}
                    style={{ marginLeft: 24, marginTop: 4 }}
                  >
                    <View
                      style={[
                        styles.addonItem,
                        {
                          backgroundColor: selectedServices.some((s) => s.serviceId === service.id && s.addonId === addon.id)
                            ? `${colors.primary}10`
                            : colors.surfaceHighlight,
                          borderColor: selectedServices.some((s) => s.serviceId === service.id && s.addonId === addon.id)
                            ? `${colors.primary}40`
                            : 'transparent',
                        },
                      ]}
                    >
                      <View style={styles.row}>
                        <Text style={[styles.addonName, { color: colors.text }]}>+ {addon.name}</Text>
                        <Text style={[styles.addonDetail, { color: colors.textMuted }]}>(+{addon.durationExtraMinutes} min)</Text>
                      </View>
                      {selectedServices.some((s) => s.serviceId === service.id && s.addonId === addon.id) && (
                        <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
        </View>

        <Button onPress={handleSubmit} isLoading={updateMutation.isPending} size="lg" style={{ marginBottom: 24 }}>
          Guardar cambios
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
  error: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
  },
  picker: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  servicesList: {
    gap: 8,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  serviceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
  },
  serviceDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  checkMark: {
    fontWeight: '700',
    fontSize: 16,
  },
  addonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  addonName: {
    fontSize: 14,
  },
  addonDetail: {
    fontSize: 12,
    marginLeft: 8,
  },
});