import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Weight, Scissors, FileText, Trash2, ChevronRight, Pencil, Camera } from 'lucide-react-native';
import { useImagePicker } from '@/hooks/useImagePicker';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { petsService, PET_SIZE_LABELS, PET_SEX_LABELS, PET_COAT_LABELS } from '@groomly/shared';
import type { Appointment } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function MascotaDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const { imageUri, pickImage, takePhoto, setImageUri } = useImagePicker();

  const { data: pet, isLoading } = useQuery({
    queryKey: ['pet', id],
    queryFn: () => petsService.getPet(id as string),
  });

  const { data: history } = useQuery({
    queryKey: ['pet-history', id],
    queryFn: () => petsService.getPetHistory(id as string),
    enabled: activeTab === 'history',
  });

  const archiveMutation = useMutation({
    mutationFn: () => petsService.archivePet(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      router.back();
    },
  });

  const handleArchive = () => {
    Alert.alert(
      'Archivar mascota',
      `¿Estás seguro de archivar a ${pet?.name}?`,
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

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Cargando...</Text>
      </Screen>
    );
  }

  if (!pet) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Mascota no encontrada</Text>
      </Screen>
    );
  }

  const tabs = [
    { key: 'info' as const, label: 'Info' },
    { key: 'history' as const, label: 'Historial' },
  ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={async () => {
            const uri = await pickImage();
            if (uri) setImageUri(uri);
          }}>
            <View style={[styles.photoContainer, { backgroundColor: `${colors.primary}12` }]}>
              {imageUri || pet.photoUrl ? (
                <Image source={{ uri: imageUri || pet.photoUrl }} style={styles.photo} />
              ) : (
                <Text style={[styles.photoInitial, { color: colors.primary }]}>
                  {pet.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Camera size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.text }]}>{pet.name}</Text>
          {pet.owner && (
            <Text style={[styles.owner, { color: colors.textMuted }]}>
              Dueño: {pet.owner.fullName}
            </Text>
          )}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => router.push(`/(staff)/mascotas/${id}/edit`)}
              style={[styles.actionButton, { backgroundColor: `${colors.primary}10` }]}
            >
              <Pencil size={14} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                const uri = await takePhoto();
                if (uri) setImageUri(uri);
              }}
              style={[styles.actionButton, { backgroundColor: colors.surfaceHighlight }]}
            >
              <Camera size={14} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Foto</Text>
            </TouchableOpacity>
          </View>
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

        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <Card>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Características</Text>
              {pet.breed && (
                <View style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                  <Scissors size={18} color={colors.textSecondary} />
                  <Text style={[styles.featureLabel, { color: colors.text }]}>Raza</Text>
                  <Text style={[styles.featureValue, { color: colors.textSecondary }]}>{pet.breed}</Text>
                </View>
              )}
              {pet.size && (
                <View style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                  <Weight size={18} color={colors.textSecondary} />
                  <Text style={[styles.featureLabel, { color: colors.text }]}>Tamaño</Text>
                  <Text style={[styles.featureValue, { color: colors.textSecondary }]}>{PET_SIZE_LABELS[pet.size]}</Text>
                </View>
              )}
              {pet.sex && (
                <View style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.featureLabel, { color: colors.text }]}>Sexo</Text>
                  <Text style={[styles.featureValue, { color: colors.textSecondary }]}>{PET_SEX_LABELS[pet.sex]}</Text>
                </View>
              )}
              {pet.coatType && (
                <View style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.featureLabel, { color: colors.text }]}>Pelaje</Text>
                  <Text style={[styles.featureValue, { color: colors.textSecondary }]}>{PET_COAT_LABELS[pet.coatType]}</Text>
                </View>
              )}
              {pet.weightKg && (
                <View style={styles.featureRow}>
                  <Text style={[styles.featureLabel, { color: colors.text }]}>Peso</Text>
                  <Text style={[styles.featureValue, { color: colors.textSecondary }]}>{pet.weightKg} kg</Text>
                </View>
              )}
            </Card>

            {pet.allergies && (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Alergias</Text>
                <View style={styles.row}>
                  <FileText size={18} color={colors.textSecondary} />
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>{pet.allergies}</Text>
                </View>
              </Card>
            )}

            {pet.medicalNotes && (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Notas médicas</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{pet.medicalNotes}</Text>
              </Card>
            )}

            {pet.behaviorNotes && (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Comportamiento</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{pet.behaviorNotes}</Text>
              </Card>
            )}

            {pet.groomingNotes && (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Notas de peluquería</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{pet.groomingNotes}</Text>
              </Card>
            )}

            <Button variant="outline" onPress={handleArchive} style={{ marginTop: 16 }}>
              <View style={styles.row}>
                <Trash2 size={16} color={colors.error} />
                <Text style={[styles.archiveText, { color: colors.error }]}>Archivar mascota</Text>
              </View>
            </Button>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            {history?.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Calendar size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tiene historial de citas</Text>
              </Card>
            ) : (
              history?.map((appt: Appointment) => (
                <Card key={appt.id} style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <View>
                      <Text style={[styles.historyDate, { color: colors.text }]}>
                        {appt.date} · {appt.startTime}
                      </Text>
                      <Text style={[styles.historyServices, { color: colors.textMuted }]}>
                        {appt.services?.map((s) => s.serviceName).join(', ')}
                      </Text>
                    </View>
                    <Text style={[styles.historyPrice, { color: colors.primary }]}>{appt.totalPrice}€</Text>
                  </View>
                </Card>
              ))
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
  photoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoInitial: {
    fontSize: 30,
    fontWeight: '700',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 12,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  owner: {
    fontSize: 13,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionText: {
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
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  featureLabel: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
  },
  featureValue: {
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
  historyCard: {
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyServices: {
    fontSize: 12,
    marginTop: 2,
  },
  historyPrice: {
    fontWeight: '700',
    fontSize: 15,
  },
});