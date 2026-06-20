import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { User, Mail, Phone, MapPin, FileText, CreditCard } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { customersService, extractErrorMessage } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function EditClientePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersService.getCustomer(id as string),
  });

  const [form, setForm] = useState({
    fullName: customer?.fullName ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
    city: customer?.city ?? '',
    postalCode: customer?.postalCode ?? '',
    dniNif: customer?.dniNif ?? '',
    notes: customer?.notes ?? '',
  });

  // Actualizar form cuando lleguen los datos
  useState(() => {
    if (customer) {
      setForm({
        fullName: customer.fullName ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        postalCode: customer.postalCode ?? '',
        dniNif: customer.dniNif ?? '',
        notes: customer.notes ?? '',
      });
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof customersService.updateCustomer>[1]) =>
      customersService.updateCustomer(id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.back();
    },
    onError: (err) => {
      setErrors({ general: extractErrorMessage(err) });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim()) newErrors.fullName = 'El nombre es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    updateMutation.mutate({
      fullName: form.fullName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      postalCode: form.postalCode || undefined,
      dniNif: form.dniNif || undefined,
      notes: form.notes || undefined,
    });
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Cargando...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.text }]}>Editar cliente</Text>

          {errors.general && (
            <Text style={[styles.error, { color: colors.error }]}>{errors.general}</Text>
          )}

          <View style={styles.form}>
            <Input
              label="Nombre completo *"
              placeholder="Ej: María García"
              value={form.fullName}
              onChangeText={(v) => updateField('fullName', v)}
              icon={<User size={18} color={colors.textMuted} />}
              error={errors.fullName}
            />

            <Input
              label="Email"
              placeholder="cliente@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              icon={<Mail size={18} color={colors.textMuted} />}
            />

            <Input
              label="Teléfono"
              placeholder="600 000 000"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => updateField('phone', v)}
              icon={<Phone size={18} color={colors.textMuted} />}
            />

            <Input
              label="DNI/NIF"
              placeholder="12345678A"
              autoCapitalize="characters"
              value={form.dniNif}
              onChangeText={(v) => updateField('dniNif', v)}
              icon={<CreditCard size={18} color={colors.textMuted} />}
            />

            <Input
              label="Dirección"
              placeholder="Calle Principal 123"
              value={form.address}
              onChangeText={(v) => updateField('address', v)}
              icon={<MapPin size={18} color={colors.textMuted} />}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Ciudad"
                  placeholder="Madrid"
                  value={form.city}
                  onChangeText={(v) => updateField('city', v)}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Código postal"
                  placeholder="28001"
                  keyboardType="number-pad"
                  value={form.postalCode}
                  onChangeText={(v) => updateField('postalCode', v)}
                />
              </View>
            </View>

            <Input
              label="Notas"
              placeholder="Información adicional..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={form.notes}
              onChangeText={(v) => updateField('notes', v)}
              icon={<FileText size={18} color={colors.textMuted} />}
              style={{ paddingVertical: 8 }}
            />
          </View>

          <Button
            onPress={handleSubmit}
            isLoading={updateMutation.isPending}
            size="lg"
            style={{ marginBottom: 24 }}
          >
            Guardar cambios
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
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
  form: {
    gap: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
});