import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search, Plus, User, Phone, Mail } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { customersService } from '@groomly/shared';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import type { Customer } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function ClientesListPage() {
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
    queryKey: ['customers', debouncedSearch],
    queryFn: () =>
      customersService.listCustomers({
        search: debouncedSearch || undefined,
        limit: 50,
      }),
  });

  const customers = data?.data ?? [];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: `${colors.success}18`, text: colors.success, label: 'Activo' };
      case 'inactive':
        return { bg: `${colors.warning}18`, text: colors.warning, label: 'Inactivo' };
      default:
        return { bg: `${colors.textMuted}18`, text: colors.textMuted, label: 'Archivado' };
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Customer }) => {
      const status = getStatusStyle(item.status);
      return (
        <TouchableOpacity
          onPress={() => router.push(`/(staff)/clientes/${item.id}`)}
          activeOpacity={0.7}
        >
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}12` }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {item.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.name, { color: colors.text }]}>{item.fullName}</Text>
                <View style={styles.detailRow}>
                  {item.phone && (
                    <View style={styles.detailItem}>
                      <Phone size={12} color={colors.textMuted} />
                      <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.phone}</Text>
                    </View>
                  )}
                  {item.city && (
                    <View style={styles.detailItem}>
                      <Mail size={12} color={colors.textMuted} />
                      <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.city}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      );
    },
    [router, colors]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Clientes</Text>
        <TouchableOpacity
          onPress={() => router.push('/(staff)/clientes/new')}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Input
        placeholder="Buscar cliente..."
        value={search}
        onChangeText={handleSearchChange}
        icon={<Search size={18} color={colors.textMuted} />}
        style={{ marginBottom: 12 }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Cargando clientes...</Text>
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.center}>
          <User size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {debouncedSearch
              ? 'No se encontraron clientes'
              : 'No hay clientes aún\nAñade tu primer cliente'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={customers}
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 11,
    marginLeft: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
