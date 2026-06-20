import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search, Plus, PawPrint } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { petsService } from '@groomly/shared';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import type { Pet } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function MascotasListPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const debounce = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value);
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debounce(value);
  };

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['pets', debouncedSearch],
    queryFn: () =>
      petsService.listPets({
        search: debouncedSearch || undefined,
        limit: 50,
      }),
  });

  const pets = data?.data ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Pet }) => (
      <TouchableOpacity
        onPress={() => router.push(`/(staff)/mascotas/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}12` }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.detail, { color: colors.textSecondary }]}>
                {item.breed || 'Raza desconocida'} · {item.size}
              </Text>
            </View>
            {item.owner && (
              <Text style={[styles.owner, { color: colors.textMuted }]}>{item.owner.fullName}</Text>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    ),
    [router, colors]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Mascotas</Text>
        <TouchableOpacity
          onPress={() => router.push('/(staff)/mascotas/new')}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Input
        placeholder="Buscar mascota..."
        value={search}
        onChangeText={handleSearchChange}
        icon={<Search size={18} color={colors.textMuted} />}
        style={{ marginBottom: 12 }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Cargando mascotas...</Text>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.center}>
          <PawPrint size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {debouncedSearch
              ? 'No se encontraron mascotas'
              : 'No hay mascotas aún\nAñade tu primera mascota'}
          </Text>
        </View>
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
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
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
  emptyText: {
    marginTop: 12,
    textAlign: 'center',
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
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
  },
  owner: {
    fontSize: 11,
  },
});
