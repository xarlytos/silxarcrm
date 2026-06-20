import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { inventoryService, type InventoryItem } from '@groomly/shared';
import type { InventoryCategory } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';
import { Package, AlertTriangle, Plus, Search, X } from 'lucide-react-native';

const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  other: 'Otro',
  food: 'Alimento',
  grooming: 'Peluquería',
  health: 'Salud',
  accessories: 'Accesorios',
  toys: 'Juguetes',
};

export default function InventarioPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: itemsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.listInventoryItems(),
  });

  const { data: alertsData } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => inventoryService.getInventoryAlerts(),
  });

  const items = itemsData?.data ?? [];
  const alerts = alertsData?.data ?? [];

  const filtered = search.trim()
    ? items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const totalValue = items.reduce((sum, p) => sum + p.stock * p.unitPrice, 0);

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const getStockStyle = (item: InventoryItem) => {
    if (item.stock === 0) return { bg: `${colors.error}18`, text: colors.error, label: 'Agotado' };
    if (item.stock <= item.minStock) return { bg: `${colors.warning}18`, text: colors.warning, label: 'Bajo' };
    return { bg: `${colors.success}18`, text: colors.success, label: 'OK' };
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Inventario</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              style={[styles.iconButton, { backgroundColor: colors.surfaceHighlight }]}
            >
              {showSearch ? <X size={18} color={colors.textSecondary} /> : <Search size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(staff)/inventario/new')}
              style={[styles.iconButton, { backgroundColor: colors.primary }]}
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        {showSearch && (
          <View style={{ marginBottom: 12 }}>
            <TextInput
              placeholder="Buscar producto..."
              value={search}
              onChangeText={setSearch}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>
        )}

        {/* KPIs */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{items.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Productos</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.error }]}>{alerts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Stock bajo</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{formatCurrency(totalValue)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Valor</Text>
          </Card>
        </View>

        {/* Low stock alerts */}
        {alerts.length > 0 && !search && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>⚠️ Alertas de stock</Text>
            {alerts.slice(0, 3).map((p) => (
              <Card key={p.id} style={[styles.alertCard, { backgroundColor: `${colors.error}10` }]}>
                <View style={styles.row}>
                  <AlertTriangle size={18} color={colors.error} />
                  <View style={styles.infoCol}>
                    <Text style={[styles.alertName, { color: colors.text }]}>{p.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                      {p.stock} {p.unit} (mín: {p.minStock})
                    </Text>
                  </View>
                  <Text style={[styles.alertBadge, { color: colors.error }]}>
                    {p.stock === 0 ? 'Agotado' : 'Bajo'}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Products list */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {search ? `Resultados (${filtered.length})` : 'Productos'}
        </Text>

        {isLoading ? (
          <View style={styles.center}>
            <Text style={{ color: colors.textMuted }}>Cargando...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Package size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>
              {search ? 'No se encontraron productos' : 'No hay productos en inventario'}
            </Text>
          </Card>
        ) : (
          filtered.map((p) => {
            const stockStyle = getStockStyle(p);
            return (
              <TouchableOpacity key={p.id} onPress={() => router.push(`/(staff)/inventario/${p.id}`)}>
                <Card style={styles.productCard}>
                  <View style={styles.row}>
                    <View style={[styles.productIcon, { backgroundColor: `${colors.primary}12` }]}>
                      <Package size={18} color={colors.primary} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={[styles.productName, { color: colors.text }]}>{p.name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                        {INVENTORY_CATEGORY_LABELS[p.category]} · {formatCurrency(p.unitPrice)}/{p.unit}
                      </Text>
                    </View>
                    <View style={styles.stockCol}>
                      <View style={[styles.stockBadge, { backgroundColor: stockStyle.bg }]}>
                        <Text style={[styles.stockNumber, { color: stockStyle.text }]}>
                          {p.stock}
                        </Text>
                      </View>
                      <Text style={[styles.stockLabel, { color: colors.textMuted }]}>{stockStyle.label}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontWeight: '700',
    fontSize: 20,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  alertCard: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  alertName: {
    fontSize: 15,
    fontWeight: '500',
  },
  alertBadge: {
    fontWeight: '700',
    fontSize: 13,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  productCard: {
    marginBottom: 8,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
  },
  stockCol: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  stockNumber: {
    fontWeight: '700',
    fontSize: 14,
  },
  stockLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});