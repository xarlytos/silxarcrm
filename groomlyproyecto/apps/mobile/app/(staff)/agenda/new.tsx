import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  User,
  PawPrint,
  Scissors,
  Calendar,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  appointmentsService,
  customersService,
  groomersService,
  servicesService,
  extractErrorMessage,
  ymd,
  priceForSize,
} from '@groomly/shared';
import type { Customer, Pet, Groomer, Service, Slot } from '@groomly/shared';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/contexts/ThemeContext';

type Step = 'client' | 'pet' | 'services' | 'groomer' | 'datetime' | 'confirm';

export default function NewAppointmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { scheduleAppointmentReminder } = useNotifications();

  const [step, setStep] = useState<Step>('client');
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedServices, setSelectedServices] = useState<Array<{ serviceId: string; addonId?: string }>>([]);
  const [selectedGroomer, setSelectedGroomer] = useState<Groomer | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch data
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-appointment'],
    queryFn: () => customersService.listCustomers({ limit: 100 }),
  });

  const { data: petsData } = useQuery({
    queryKey: ['pets-for-appointment', selectedClient?.id],
    queryFn: () => customersService.getCustomerPets(selectedClient!.id),
    enabled: !!selectedClient,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services-for-appointment'],
    queryFn: () => servicesService.listServices(),
  });

  const { data: groomersData } = useQuery({
    queryKey: ['groomers-for-appointment'],
    queryFn: () => groomersService.listGroomers(),
  });

  const customers = customersData?.data ?? [];
  const pets = petsData ?? [];
  const services = servicesData ?? [];
  const groomers = groomersData ?? [];

  // Compute total duration before slots query
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((acc, s) => {
      const svc = services.find((sv) => sv.id === s.serviceId);
      if (!svc) return acc;
      let duration = svc.durationMinutes;
      if (s.addonId) {
        const addon = svc.addons?.find((a) => a.id === s.addonId);
        if (addon) duration += addon.durationExtraMinutes;
      }
      return acc + duration;
    }, 0);
  }, [selectedServices, services]);

  const { data: slots } = useQuery({
    queryKey: ['slots', selectedDate, selectedGroomer?.id, totalDuration],
    queryFn: () =>
      appointmentsService.listSlots({
        date: ymd(selectedDate),
        durationMinutes: totalDuration,
        groomerId: selectedGroomer?.id,
      }),
    enabled: step === 'datetime' && totalDuration > 0,
  });

  const totalPrice = useMemo(() => {
    if (!selectedPet) return 0;
    return selectedServices.reduce((acc, s) => {
      const svc = services.find((sv) => sv.id === s.serviceId);
      if (!svc) return acc;
      let price = priceForSize(svc, selectedPet.size);
      if (s.addonId) {
        const addon = svc.addons?.find((a) => a.id === s.addonId);
        if (addon) price += addon.price;
      }
      return acc + price;
    }, 0);
  }, [selectedServices, services, selectedPet]);

  const createMutation = useMutation({
    mutationFn: appointmentsService.createAppointment,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (selectedClient && selectedPet) {
        await scheduleAppointmentReminder({
          appointmentId: data.id,
          customerName: selectedClient.fullName,
          petName: selectedPet.name,
          date: data.date,
          time: data.startTime,
          minutesBefore: 60,
        });
      }
      router.back();
    },
    onError: (err) => {
      setErrors({ general: extractErrorMessage(err) });
    },
  });

  const handleSubmit = () => {
    if (!selectedClient || !selectedPet || !selectedSlot) return;
    createMutation.mutate({
      customerId: selectedClient.id,
      petId: selectedPet.id,
      groomerId: selectedGroomer?.id,
      date: ymd(selectedDate),
      startTime: selectedSlot.startTime,
      services: selectedServices,
      notes: notes || undefined,
      source: 'manual',
    });
  };

  const toggleService = (serviceId: string, addonId?: string) => {
    setSelectedServices((prev) => {
      const exists = prev.find(
        (s) => s.serviceId === serviceId && s.addonId === addonId
      );
      if (exists) {
        return prev.filter(
          (s) => !(s.serviceId === serviceId && s.addonId === addonId)
        );
      }
      return [...prev, { serviceId, addonId }];
    });
  };

  const isServiceSelected = (serviceId: string, addonId?: string) =>
    selectedServices.some(
      (s) => s.serviceId === serviceId && s.addonId === addonId
    );

  const changeDay = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'client', label: 'Cliente' },
    { key: 'pet', label: 'Mascota' },
    { key: 'services', label: 'Servicios' },
    { key: 'groomer', label: 'Peluquero' },
    { key: 'datetime', label: 'Hora' },
    { key: 'confirm', label: 'Confirmar' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const s = getStyles(colors);

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex1}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress */}
          <View style={s.header}>
            <Text style={[s.title, { color: colors.text }]}>
              Nueva cita
            </Text>
            <Text style={[s.stepCount, { color: colors.primary }]}>
              {currentStepIndex + 1}/{steps.length}
            </Text>
          </View>

          {/* Step indicators */}
          <View style={s.stepIndicators}>
            {steps.map((st, i) => (
              <View key={st.key} style={s.stepRow}>
                <View
                  style={[
                    s.stepDot,
                    { backgroundColor: i <= currentStepIndex ? colors.primary : colors.surfaceHighlight },
                  ]}
                >
                  <Text
                    style={[
                      s.stepDotText,
                      { color: i <= currentStepIndex ? '#0A0B10' : colors.textMuted },
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
                {i < steps.length - 1 && (
                  <View
                    style={[
                      s.stepLine,
                      { backgroundColor: i < currentStepIndex ? colors.primary : colors.surfaceHighlight },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          {errors.general && (
            <Text style={[s.error, { color: colors.error }]}>
              {errors.general}
            </Text>
          )}

          {/* Step: Client */}
          {step === 'client' && (
            <View style={s.stepContent}>
              <Text style={[s.stepLabel, { color: colors.textSecondary }]}>
                Selecciona un cliente
              </Text>
              {customers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => {
                    setSelectedClient(c);
                    setSelectedPet(null);
                    setStep('pet');
                  }}
                >
                  <View
                    style={[
                      s.selectableItem,
                      {
                        backgroundColor: selectedClient?.id === c.id ? `${colors.primary}10` : colors.surface,
                        borderColor: selectedClient?.id === c.id ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <View style={[s.avatar, { backgroundColor: `${colors.primary}12` }]}>
                      <Text style={[s.avatarText, { color: colors.primary }]}>
                        {c.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.infoCol}>
                      <Text style={[s.itemName, { color: colors.text }]}>
                        {c.fullName}
                      </Text>
                      <Text style={[s.itemDetail, { color: colors.textMuted }]}>{c.phone}</Text>
                    </View>
                    {selectedClient?.id === c.id && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step: Pet */}
          {step === 'pet' && (
            <View style={s.stepContent}>
              <Text style={[s.stepLabel, { color: colors.textSecondary }]}>
                Selecciona una mascota
              </Text>
              {pets.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    setSelectedPet(p);
                    setStep('services');
                  }}
                >
                  <View
                    style={[
                      s.selectableItem,
                      {
                        backgroundColor: selectedPet?.id === p.id ? `${colors.primary}10` : colors.surface,
                        borderColor: selectedPet?.id === p.id ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <View style={[s.avatar, { backgroundColor: `${colors.primary}12` }]}>
                      <Text style={[s.avatarText, { color: colors.primary }]}>
                        {p.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.infoCol}>
                      <Text style={[s.itemName, { color: colors.text }]}>{p.name}</Text>
                      <Text style={[s.itemDetail, { color: colors.textMuted }]}>
                        {p.breed} · {p.size}
                      </Text>
                    </View>
                    {selectedPet?.id === p.id && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {pets.length === 0 && (
                <Text style={[s.emptyText, { color: colors.textMuted }]}>
                  Este cliente no tiene mascotas registradas
                </Text>
              )}
            </View>
          )}

          {/* Step: Services */}
          {step === 'services' && (
            <View style={s.stepContent}>
              <Text style={[s.stepLabel, { color: colors.textSecondary }]}>
                Selecciona servicios
              </Text>
              {services
                .filter((s) => s.active)
                .map((service) => (
                  <View key={service.id}>
                    <TouchableOpacity
                      onPress={() => toggleService(service.id)}
                    >
                      <View
                        style={[
                          s.selectableItem,
                          {
                            backgroundColor: isServiceSelected(service.id)
                              ? `${colors.primary}10`
                              : colors.surface,
                            borderColor: isServiceSelected(service.id)
                              ? colors.primary
                              : 'transparent',
                          },
                        ]}
                      >
                        <View style={s.rowBetween}>
                          <View style={s.row}>
                            <View
                              style={[
                                s.serviceDot,
                                { backgroundColor: service.color || colors.primary },
                              ]}
                            />
                            <View>
                              <Text style={[s.itemName, { color: colors.text }]}>
                                {service.name}
                              </Text>
                              <Text style={[s.itemDetail, { color: colors.textMuted }]}>
                                {service.durationMinutes} min ·{' '}
                                {selectedPet
                                  ? priceForSize(service, selectedPet.size)
                                  : service.price}
                                €
                              </Text>
                            </View>
                          </View>
                          {isServiceSelected(service.id) && (
                            <Check size={20} color={colors.primary} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Addons */}
                    {service.addons?.map((addon) => (
                      <TouchableOpacity
                        key={addon.id}
                        onPress={() => toggleService(service.id, addon.id)}
                        style={{ marginLeft: 24, marginTop: 4 }}
                      >
                        <View
                          style={[
                            s.addonItem,
                            {
                              backgroundColor: isServiceSelected(service.id, addon.id)
                                ? `${colors.primary}10`
                                : colors.surfaceHighlight,
                              borderColor: isServiceSelected(service.id, addon.id)
                                ? `${colors.primary}40`
                                : 'transparent',
                            },
                          ]}
                        >
                          <View style={s.row}>
                            <Text style={[s.addonName, { color: colors.text }]}>
                              + {addon.name}
                            </Text>
                            <Text style={[s.addonDetail, { color: colors.textMuted }]}>
                              (+{addon.durationExtraMinutes} min · +{addon.price}€)
                            </Text>
                          </View>
                          {isServiceSelected(service.id, addon.id) && (
                            <Check size={16} color={colors.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}

              {selectedServices.length > 0 && (
                <View style={[s.totalBox, { backgroundColor: `${colors.primary}10` }]}>
                  <Text style={[s.totalText, { color: colors.primary }]}>
                    Total: {totalPrice}€ · {totalDuration} min
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Step: Groomer */}
          {step === 'groomer' && (
            <View style={s.stepContent}>
              <Text style={[s.stepLabel, { color: colors.textSecondary }]}>
                Selecciona peluquero (opcional)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedGroomer(null);
                  setStep('datetime');
                }}
              >
                <View
                  style={[
                    s.selectableItem,
                    {
                      backgroundColor: selectedGroomer === null ? `${colors.primary}10` : colors.surface,
                      borderColor: selectedGroomer === null ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={[s.itemName, { color: colors.text, flex: 1 }]}>
                    Cualquier peluquero disponible
                  </Text>
                  {selectedGroomer === null && (
                    <Check size={20} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
              {groomers
                .filter((g) => g.active)
                .map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => {
                      setSelectedGroomer(g);
                      setStep('datetime');
                    }}
                  >
                    <View
                      style={[
                        s.selectableItem,
                        {
                          backgroundColor: selectedGroomer?.id === g.id
                            ? `${colors.primary}10`
                            : colors.surface,
                          borderColor: selectedGroomer?.id === g.id
                            ? colors.primary
                            : 'transparent',
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.groomerDot,
                          { backgroundColor: g.color || colors.primary },
                        ]}
                      />
                      <View style={s.infoCol}>
                        <Text style={[s.itemName, { color: colors.text }]}>
                          {g.name}
                        </Text>
                        <Text style={[s.itemDetail, { color: colors.textMuted }]}>
                          {g.specialties?.join(', ') || 'Peluquero'}
                        </Text>
                      </View>
                      {selectedGroomer?.id === g.id && (
                        <Check size={20} color={colors.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Step: DateTime */}
          {step === 'datetime' && (
            <View style={s.stepContent}>
              {/* Date selector */}
              <View style={[s.dateSelector, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  onPress={() => changeDay(-1)}
                  style={s.chevronBtn}
                >
                  <ChevronLeft size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={s.dateInfo}>
                  <Text style={[s.dateText, { color: colors.text }]}>
                    {selectedDate.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Text>
                  <Text style={[s.dateSubtext, { color: colors.textMuted }]}>
                    {ymd(selectedDate)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => changeDay(1)}
                  style={s.chevronBtn}
                >
                  <ChevronRight size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Slots */}
              <Text style={[s.stepLabel, { color: colors.textSecondary }]}>
                Horarios disponibles
              </Text>
              {!slots ? (
                <Text style={[s.emptyText, { color: colors.textMuted }]}>
                  Cargando horarios...
                </Text>
              ) : slots.length === 0 ? (
                <Text style={[s.emptyText, { color: colors.textMuted }]}>
                  No hay horarios disponibles para este día
                </Text>
              ) : (
                <View style={s.slotsGrid}>
                  {slots.map((slot) => (
                    <TouchableOpacity
                      key={`${slot.startTime}-${slot.groomerId}`}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <View
                        style={[
                          s.slotItem,
                          {
                            backgroundColor:
                              selectedSlot?.startTime === slot.startTime &&
                              selectedSlot?.groomerId === slot.groomerId
                                ? colors.primary
                                : colors.surface,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.slotTime,
                            {
                              color:
                                selectedSlot?.startTime === slot.startTime &&
                                selectedSlot?.groomerId === slot.groomerId
                                  ? '#0A0B10'
                                  : colors.text,
                            },
                          ]}
                        >
                          {slot.startTime}
                        </Text>
                        <Text
                          style={[
                            s.slotGroomer,
                            {
                              color:
                                selectedSlot?.startTime === slot.startTime &&
                                selectedSlot?.groomerId === slot.groomerId
                                  ? `${colors.background}99`
                                  : colors.textMuted,
                            },
                          ]}
                        >
                          {slot.groomerName}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <View style={s.stepContent}>
              <Text style={[s.stepLabel, { color: colors.textSecondary }]}>
                Resumen de la cita
              </Text>

              <View style={[s.summaryBox, { backgroundColor: colors.surface }]}>
                <View style={s.summaryRow}>
                  <User size={18} color={colors.textSecondary} />
                  <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Cliente</Text>
                  <Text style={[s.summaryValue, { color: colors.text }]}>
                    {selectedClient?.fullName}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <PawPrint size={18} color={colors.textSecondary} />
                  <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Mascota</Text>
                  <Text style={[s.summaryValue, { color: colors.text }]}>
                    {selectedPet?.name}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Scissors size={18} color={colors.textSecondary} />
                  <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Servicios</Text>
                  <Text style={[s.summaryValue, { color: colors.text }]}>
                    {selectedServices.length}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Calendar size={18} color={colors.textSecondary} />
                  <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Fecha</Text>
                  <Text style={[s.summaryValue, { color: colors.text }]}>
                    {selectedDate.toLocaleDateString('es-ES')}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Clock size={18} color={colors.textSecondary} />
                  <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Hora</Text>
                  <Text style={[s.summaryValue, { color: colors.text }]}>
                    {selectedSlot?.startTime}
                  </Text>
                </View>

                {selectedGroomer && (
                  <View style={s.summaryRow}>
                    <View
                      style={[
                        s.groomerDotSmall,
                        { backgroundColor: selectedGroomer.color || colors.primary },
                      ]}
                    />
                    <Text style={[s.summaryLabel, { color: colors.textMuted }]}>
                      Peluquero
                    </Text>
                    <Text style={[s.summaryValue, { color: colors.text }]}>
                      {selectedGroomer.name}
                    </Text>
                  </View>
                )}

                <View style={[s.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[s.totalLabel, { color: colors.text }]}>Total</Text>
                  <Text style={[s.totalPrice, { color: colors.primary }]}>
                    {totalPrice}€
                  </Text>
                </View>
                <Text style={[s.totalDuration, { color: colors.textMuted }]}>
                  {totalDuration} minutos
                </Text>
              </View>

              <Input
                label="Notas (opcional)"
                placeholder="Notas para la cita..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
                style={{ paddingVertical: 8 }}
              />
            </View>
          )}

          {/* Navigation buttons */}
          <View style={s.navButtons}>
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                onPress={() => setStep(steps[currentStepIndex - 1].key)}
                style={s.navButton}
              >
                Atrás
              </Button>
            )}

            {step === 'confirm' ? (
              <Button
                onPress={handleSubmit}
                isLoading={createMutation.isPending}
                style={s.navButton}
                size="lg"
              >
                Crear cita
              </Button>
            ) : step === 'datetime' ? (
              <Button
                onPress={() => selectedSlot && setStep('confirm')}
                disabled={!selectedSlot}
                style={s.navButton}
                size="lg"
              >
                Continuar
              </Button>
            ) : step === 'services' ? (
              <Button
                onPress={() =>
                  selectedServices.length > 0 && setStep('groomer')
                }
                disabled={selectedServices.length === 0}
                style={s.navButton}
                size="lg"
              >
                Continuar
              </Button>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    flex1: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      flex: 1,
    },
    stepCount: {
      fontWeight: '500',
      fontSize: 15,
    },
    stepIndicators: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    stepRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    stepDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotText: {
      fontSize: 12,
      fontWeight: '700',
    },
    stepLine: {
      flex: 1,
      height: 2,
      marginHorizontal: 4,
    },
    error: {
      textAlign: 'center',
      marginBottom: 12,
      fontSize: 14,
    },
    stepContent: {
      gap: 8,
    },
    stepLabel: {
      fontWeight: '500',
      fontSize: 15,
      marginBottom: 8,
    },
    selectableItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      marginBottom: 8,
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
    itemName: {
      fontSize: 15,
      fontWeight: '500',
    },
    itemDetail: {
      fontSize: 13,
      marginTop: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flex: 1,
    },
    serviceDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 12,
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
    totalBox: {
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
    },
    totalText: {
      fontWeight: '600',
      fontSize: 14,
    },
    groomerDot: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    emptyText: {
      textAlign: 'center',
      paddingVertical: 32,
      fontSize: 14,
    },
    dateSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
    },
    chevronBtn: {
      padding: 8,
    },
    dateInfo: {
      alignItems: 'center',
    },
    dateText: {
      fontWeight: '600',
      fontSize: 15,
    },
    dateSubtext: {
      fontSize: 12,
      marginTop: 2,
    },
    slotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    slotItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      minWidth: 80,
      alignItems: 'center',
    },
    slotTime: {
      fontWeight: '500',
      fontSize: 14,
    },
    slotGroomer: {
      fontSize: 11,
      marginTop: 2,
    },
    summaryBox: {
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryLabel: {
      marginLeft: 8,
      flex: 1,
      fontSize: 14,
    },
    summaryValue: {
      fontWeight: '500',
      fontSize: 14,
    },
    groomerDotSmall: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: 8,
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
    totalDuration: {
      fontSize: 13,
      textAlign: 'right',
      marginTop: 2,
    },
    navButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      marginBottom: 24,
    },
    navButton: {
      flex: 1,
    },
  });
}