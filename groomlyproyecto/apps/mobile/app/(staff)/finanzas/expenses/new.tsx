import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, DollarSign, FileText, ChevronDown } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { expensesService, extractErrorMessage, EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS, ymd } from '@groomly/shared';
import type { ExpenseCategory, PaymentMethod } from '@groomly/shared';

export default function NewExpensePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other' as ExpenseCategory,
    paymentMethod: 'cash' as PaymentMethod,
    vendor: '',
    date: ymd(new Date()),
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: expensesService.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      router.back();
    },
    onError: (err) => {
      setErrors({ general: extractErrorMessage(err) });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.description.trim()) newErrors.description = 'La descripción es obligatoria';
    if (!form.amount || parseFloat(form.amount) <= 0) newErrors.amount = 'Introduce un importe válido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      paymentMethod: form.paymentMethod,
      vendor: form.vendor || undefined,
      date: form.date,
      notes: form.notes || undefined,
    });
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const categories = Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][];
  const paymentMethods = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][];

  const s = getStyles(colors);

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex1}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.title, { color: colors.text }]}>Nuevo gasto</Text>

          {errors.general && (
            <Text style={[s.error, { color: colors.error }]}>{errors.general}</Text>
          )}

          <View style={s.form}>
            <Input
              label="Descripción *"
              placeholder="Ej: Compra de champús"
              value={form.description}
              onChangeText={(v) => updateField('description', v)}
              icon={<FileText size={18} color={colors.textMuted} />}
              error={errors.description}
            />

            <Input
              label="Importe *"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={(v) => updateField('amount', v)}
              icon={<DollarSign size={18} color={colors.textMuted} />}
              error={errors.amount}
            />

            {/* Category selector */}
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Categoría</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                style={[s.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, flex: 1 }}>
                  {EXPENSE_CATEGORY_LABELS[form.category]}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={[s.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {categories.map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        updateField('category', key);
                        setShowCategoryPicker(false);
                      }}
                      style={[s.pickerItem, form.category === key && { backgroundColor: `${colors.primary}10` }]}
                    >
                      <Text style={{ color: form.category === key ? colors.primary : colors.text }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Payment method selector */}
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Método de pago</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentPicker(!showPaymentPicker)}
                style={[s.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, flex: 1 }}>
                  {PAYMENT_METHOD_LABELS[form.paymentMethod]}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showPaymentPicker && (
                <View style={[s.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {paymentMethods.map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        updateField('paymentMethod', key);
                        setShowPaymentPicker(false);
                      }}
                      style={[s.pickerItem, form.paymentMethod === key && { backgroundColor: `${colors.primary}10` }]}
                    >
                      <Text style={{ color: form.paymentMethod === key ? colors.primary : colors.text }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Input
              label="Proveedor"
              placeholder="Ej: Distribuidor Peluquería S.L."
              value={form.vendor}
              onChangeText={(v) => updateField('vendor', v)}
            />

            <Input
              label="Fecha"
              placeholder="YYYY-MM-DD"
              value={form.date}
              onChangeText={(v) => updateField('date', v)}
              icon={<Calendar size={18} color={colors.textMuted} />}
            />

            <Input
              label="Notas"
              placeholder="Notas adicionales..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={form.notes}
              onChangeText={(v) => updateField('notes', v)}
              style={{ paddingVertical: 8 }}
            />
          </View>

          <Button
            onPress={handleSubmit}
            isLoading={createMutation.isPending}
            size="lg"
            style={{ marginBottom: 24 }}
          >
            Guardar gasto
          </Button>
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
  });
}