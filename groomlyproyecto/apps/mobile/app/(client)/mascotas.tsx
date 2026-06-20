import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { petsService, PET_SIZE_LABELS } from '@groomly/shared';
import { PawPrint, Plus, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function ClientMascotasPage() {
  const router = useRouter();
  const { colors } = useTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-pets-list'],
    queryFn: () => petsService.listPets({ limit: 50 }),
  });

  const pets = data?.data ?? [];

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/(staff)/mascotas/${item.id}`)}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}12` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={[styles.petName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.petDetail, { color: colors.textSecondary }]}>
              {item.breed} · {PET_SIZE_LABELS[item.size]}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Mis mascotas</Text>
        <TouchableOpacity
          onPress={() => router.push('/(staff)/mascotas/new')}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Cargando...</Text>
        </View>
      ) : pets.length === 0 ? (
        <Card style={styles.emptyCard}>
          <PawPrint size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aún no has añadido mascotas{'\n'}Añade a tu primer peludito
          </Text>
          <TouchableOpacity onPress={() => router.push('/(staff)/mascotas/new')}>
            <Text style={[styles.emptyAction, { color: colors.primary }]}>Añadir mascota</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <FlatList
          data={pets}
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
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
});
