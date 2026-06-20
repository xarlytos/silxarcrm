import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { PawPrint, Weight, FileText, ChevronDown, Camera, Image as ImageIcon } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useImagePicker } from '@/hooks/useImagePicker';
import { petsService, customersService, extractErrorMessage, PET_SIZE_LABELS, PET_COAT_LABELS, PET_SEX_LABELS } from '@groomly/shared';
import type { PetSize, PetSex, PetCoat } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function NewMascotaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { imageUri, pickImage, takePhoto } = useImagePicker();

  const [form, setForm] = useState({
    name: '',
    breed: '',
    size: 'm' as PetSize,
    sex: '' as PetSex | '',
    coatType: '' as PetCoat | '',
    weightKg: '',
    color: '',
    allergies: '',
    medicalNotes: '',
    behaviorNotes: '',
    groomingNotes: '',
    ownerCustomerId: '',
    photoUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showSexPicker, setShowSexPicker] = useState(false);
  const [showCoatPicker, setShowCoatPicker] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pet'],
    queryFn: () => customersService.listCustomers({ limit: 100 }),
  });

  const customers = customersData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: petsService.createPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      router.back();
    },
    onError: (err) => {
      setErrors({ general: extractErrorMessage(err) });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!form.ownerCustomerId) newErrors.ownerCustomerId = 'Selecciona un dueño';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      name: form.name,
      breed: form.breed || undefined,
      size: form.size,
      sex: form.sex || undefined,
      coatType: form.coatType || undefined,
      weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
      color: form.color || undefined,
      allergies: form.allergies || undefined,
      medicalNotes: form.medicalNotes || undefined,
      behaviorNotes: form.behaviorNotes || undefined,
      groomingNotes: form.groomingNotes || undefined,
      ownerCustomerId: form.ownerCustomerId,
      photoUrl: form.photoUrl || undefined,
    });
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const sizes = Object.entries(PET_SIZE_LABELS) as [PetSize, string][];
  const coats = Object.entries(PET_COAT_LABELS) as [PetCoat, string][];
  const sexes = Object.entries(PET_SEX_LABELS) as [PetSex, string][];

  const s = getStyles(colors);

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex1}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[s.title, { color: colors.text }]}>Nueva mascota</Text>

          {errors.general && (
            <Text style={[s.error, { color: colors.error }]}>{errors.general}</Text>
          )}

          {/* Photo picker */}
          <View style={s.photoSection}>
            <TouchableOpacity onPress={async () => {
              const uri = await pickImage();
              if (uri) setForm(prev => ({ ...prev, photoUrl: uri }));
            }}>
              <View style={[s.photoContainer, { backgroundColor: `${colors.primary}12` }]}>
                {form.photoUrl || imageUri ? (
                  <Image source={{ uri: form.photoUrl || imageUri }} style={s.photo} />
                ) : (
                  <Camera size={32} color={colors.primary} />
                )}
              </View>
              <View style={[s.photoBadge, { backgroundColor: colors.primary }]}>
                <ImageIcon size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[s.photoHint, { color: colors.textMuted }]}>Toca para añadir foto</Text>
          </View>

          <View style={s.form}>
            {/* Owner selector */}
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Dueño *</Text>
              <TouchableOpacity
                onPress={() => setShowSizePicker(false)}
                style={[s.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                {form.ownerCustomerId ? (
                  <Text style={{ color: colors.text }}>
                    {customers.find((c) => c.id === form.ownerCustomerId)?.fullName}
                  </Text>
                ) : (
                  <Text style={{ color: colors.textMuted }}>Selecciona un cliente...</Text>
                )}
              </TouchableOpacity>
              {errors.ownerCustomerId && (
                <Text style={[s.fieldError, { color: colors.error }]}>{errors.ownerCustomerId}</Text>
              )}
              <View style={s.customerList}>
                {customers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => updateField('ownerCustomerId', c.id)}
                    style={[
                      s.customerItem,
                      {
                        backgroundColor: form.ownerCustomerId === c.id
                          ? `${colors.primary}10`
                          : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: form.ownerCustomerId === c.id ? colors.primary : colors.text,
                        fontWeight: form.ownerCustomerId === c.id ? '500' : '400',
                      }}
                    >
                      {c.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label="Nombre *"
              placeholder="Ej: Luna"
              value={form.name}
              onChangeText={(v) => updateField('name', v)}
              icon={<PawPrint size={18} color={colors.textMuted} />}
              error={errors.name}
            />

            <Input
              label="Raza"
              placeholder="Ej: Golden Retriever"
              value={form.breed}
              onChangeText={(v) => updateField('breed', v)}
            />

            {/* Size selector */}
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Tamaño</Text>
              <TouchableOpacity
                onPress={() => setShowSizePicker(!showSizePicker)}
                style={[s.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, flex: 1 }}>{PET_SIZE_LABELS[form.size]}</Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showSizePicker && (
                <View style={[s.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {sizes.map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        updateField('size', key);
                        setShowSizePicker(false);
                      }}
                      style={[
                        s.pickerItem,
                        form.size === key && { backgroundColor: `${colors.primary}10` },
                      ]}
                    >
                      <Text style={{ color: form.size === key ? colors.primary : colors.text }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Sex selector */}
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Sexo</Text>
              <TouchableOpacity
                onPress={() => setShowSexPicker(!showSexPicker)}
                style={[s.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, flex: 1 }}>
                  {form.sex ? PET_SEX_LABELS[form.sex] : 'Sin especificar'}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showSexPicker && (
                <View style={[s.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => {
                      updateField('sex', '');
                      setShowSexPicker(false);
                    }}
                    style={[s.pickerItem, !form.sex && { backgroundColor: `${colors.primary}10` }]}
                  >
                    <Text style={{ color: !form.sex ? colors.primary : colors.text }}>Sin especificar</Text>
                  </TouchableOpacity>
                  {sexes.map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        updateField('sex', key);
                        setShowSexPicker(false);
                      }}
                      style={[s.pickerItem, form.sex === key && { backgroundColor: `${colors.primary}10` }]}
                    >
                      <Text style={{ color: form.sex === key ? colors.primary : colors.text }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Coat selector */}
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Tipo de pelaje</Text>
              <TouchableOpacity
                onPress={() => setShowCoatPicker(!showCoatPicker)}
                style={[s.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, flex: 1 }}>
                  {form.coatType ? PET_COAT_LABELS[form.coatType] : 'Sin especificar'}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showCoatPicker && (
                <View style={[s.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => {
                      updateField('coatType', '');
                      setShowCoatPicker(false);
                    }}
                    style={[s.pickerItem, !form.coatType && { backgroundColor: `${colors.primary}10` }]}
                  >
                    <Text style={{ color: !form.coatType ? colors.primary : colors.text }}>Sin especificar</Text>
                  </TouchableOpacity>
                  {coats.map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        updateField('coatType', key);
                        setShowCoatPicker(false);
                      }}
                      style={[s.pickerItem, form.coatType === key && { backgroundColor: `${colors.primary}10` }]}
                    >
                      <Text style={{ color: form.coatType === key ? colors.primary : colors.text }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={s.row}>
              <View style={s.half}>
                <Input
                  label="Peso (kg)"
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                  value={form.weightKg}
                  onChangeText={(v) => updateField('weightKg', v)}
                  icon={<Weight size={18} color={colors.textMuted} />}
                />
              </View>
              <View style={s.half}>
                <Input
                  label="Color"
                  placeholder="Ej: Dorado"
                  value={form.color}
                  onChangeText={(v) => updateField('color', v)}
                />
              </View>
            </View>

            <Input
              label="Alergias"
              placeholder="Ej: Polen, ciertos champús..."
              value={form.allergies}
              onChangeText={(v) => updateField('allergies', v)}
            />

            <Input
              label="Notas médicas"
              placeholder="Información médica relevante..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={form.medicalNotes}
              onChangeText={(v) => updateField('medicalNotes', v)}
              icon={<FileText size={18} color={colors.textMuted} />}
              style={{ paddingVertical: 8 }}
            />

            <Input
              label="Notas de comportamiento"
              placeholder="¿Cómo se comporta durante el baño?"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              value={form.behaviorNotes}
              onChangeText={(v) => updateField('behaviorNotes', v)}
              style={{ paddingVertical: 8 }}
            />
          </View>

          <Button
            onPress={handleSubmit}
            isLoading={createMutation.isPending}
            size="lg"
            style={{ marginBottom: 24 }}
          >
            Guardar mascota
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
    photoSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    photoContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    photoBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoHint: {
      fontSize: 12,
      marginTop: 8,
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
    fieldError: {
      fontSize: 12,
      marginTop: 4,
    },
    customerList: {
      maxHeight: 160,
      marginTop: 8,
    },
    customerItem: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 4,
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