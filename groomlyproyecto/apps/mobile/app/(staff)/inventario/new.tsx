import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { inventoryService, extractErrorMessage } from '@groomly/shared';
import type { InventoryCategory, InventoryUnit } from '@groomly/shared';
import { Package, ChevronDown } from 'lucide-react-native';

const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  other: 'Otro',
  food: 'Alimento',
  grooming: 'Peluquería',
  health: 'Salud',
  accessories: 'Accesorios',
  toys: 'Juguetes',
};

const CATEGORIES = Object.entries(INVENTORY_CATEGORY_LABELS) as [InventoryCategory, string][];
const UNITS: { value: InventoryUnit; label: string }[] = [
  { value: 'unit', label: 'Unidad' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'l', label: 'Litros' },
  { value: 'g', label: 'Gramos' },
  { value: 'kg', label: 'Kilogramos' },
  { value: 'dosis', label: 'Dosis' },
];

export default function NewInventoryItemPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'other' as InventoryCategory,
    unitPrice: '',
    stock: '',
    minStock: '5',
    unit: 'unit' as InventoryUnit,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: inventoryService.createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      router.back();
    },
    onError: (err) => {
      setErrors({ general: extractErrorMessage(err) });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!form.unitPrice || parseFloat(form.unitPrice) < 0)
      newErrors.unitPrice = 'Precio inválido';
    if (!form.stock || parseInt(form.stock, 10) < 0)
      newErrors.stock = 'Stock inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      category: form.category,
      unitPrice: parseFloat(form.unitPrice),
      stock: parseInt(form.stock, 10) || 0,
      minStock: parseInt(form.minStock, 10) || 0,
      unit: form.unit,
    });
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

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
          <Text style={[s.title, { color: colors.text }]}>Nuevo producto</Text>

          {errors.general && (
            <Text style={[s.error, { color: colors.error }]}>{errors.general}</Text>
          )}

          <View style={s.form}>
            <Input
              label="Nombre *"
              placeholder="Ej: Champú perros sensible"
              value={form.name}
              onChangeText={(v) => updateField('name', v)}
              icon={<Package size={18} color={colors.textMuted} />}
              error={errors.name}
            />

            <Input
              label="SKU / Código"
              placeholder="SKU-001"
              value={form.sku}
              onChangeText={(v) => updateField('sku', v)}
            />

            {/* Category */}
            <View>
              <Text style={[s.label, { color: colors.textMuted }]}>Categoría</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                style={[s.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, flex: 1 }}>
                  {INVENTORY_CATEGORY_LABELS[form.category]}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={[s.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {CATEGORIES.map(([key, label]) => (
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

            {/* Unit */}
            <View>
              <Text style={[s.label, { color: colors.textMuted }]}>Unidad</Text>
              <TouchableOpacity
                onPress={() => setShowUnitPicker(!showUnitPicker)}
                style={[s.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, flex: 1 }}>
                  {UNITS.find((u) => u.value === form.unit)?.label}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showUnitPicker && (
                <View style={[s.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {UNITS.map((u) => (
                    <TouchableOpacity
                      key={u.value}
                      onPress={() => {
                        updateField('unit', u.value);
                        setShowUnitPicker(false);
                      }}
                      style={[s.pickerItem, form.unit === u.value && { backgroundColor: `${colors.primary}10` }]}
                    >
                      <Text style={{ color: form.unit === u.value ? colors.primary : colors.text }}>
                        {u.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={s.row}>
              <View style={s.half}>
                <Input
                  label="Precio *"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={form.unitPrice}
                  onChangeText={(v) => updateField('unitPrice', v)}
                  error={errors.unitPrice}
                />
              </View>
              <View style={s.half}>
                <Input
                  label="Stock *"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={form.stock}
                  onChangeText={(v) => updateField('stock', v)}
                  error={errors.stock}
                />
              </View>
            </View>

            <View style={s.half}>
              <Input
                label="Stock mínimo"
                placeholder="5"
                keyboardType="number-pad"
                value={form.minStock}
                onChangeText={(v) => updateField('minStock', v)}
              />
            </View>
          </View>

          <Button
            onPress={handleSubmit}
            isLoading={createMutation.isPending}
            size="lg"
            style={{ marginBottom: 24 }}
          >
            Crear producto
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
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    half: {
      flex: 1,
    },
  });
}