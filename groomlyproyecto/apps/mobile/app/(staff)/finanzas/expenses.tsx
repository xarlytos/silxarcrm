import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Plus, ShoppingCart } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { expensesService, EXPENSE_CATEGORY_LABELS } from '@groomly/shared';
import type { Expense } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function ExpensesListPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['expenses', activeCategory],
    queryFn: () =>
      expensesService.listExpenses({
        category: activeCategory === 'all' ? undefined : (activeCategory as any),
        limit: 50,
      }),
  });

  const expenses = data?.data ?? [];

  const categories: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'Todos' },
    ...Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => ({
      key,
      label: label as string,
    })),
  ];

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const renderItem = ({ item }: { item: Expense }) => (
    <Card style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.infoCol}>
          <Text style={[styles.itemName, { color: colors.text }]}>{item.description}</Text>
          <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
            {EXPENSE_CATEGORY_LABELS[item.category]} · {item.date}
          </Text>
          {item.vendor && (
            <Text style={[styles.vendor, { color: colors.textMuted }]}>{item.vendor}</Text>
          )}
        </View>
        <Text style={[styles.amount, { color: colors.error }]}>-{formatCurrency(item.amount)}</Text>
      </View>
    </Card>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Gastos</Text>
        <TouchableOpacity
          onPress={() => router.push('/(staff)/finanzas/expenses/new')}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Total */}
      <Card style={[styles.totalCard, { backgroundColor: `${colors.error}10` }]}>
        <Text style={{ color: colors.error, fontSize: 12 }}>Total gastos</Text>
        <Text style={{ color: colors.error, fontWeight: '700', fontSize: 24 }}>
          -{formatCurrency(totalExpenses)}
        </Text>
      </Card>

      {/* Category filters */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveCategory(item.key)}
            style={[
              styles.filterButton,
              {
                backgroundColor: activeCategory === item.key ? colors.primary : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeCategory === item.key ? '#0A0B10' : colors.text },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        style={{ marginBottom: 16 }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Cargando gastos...</Text>
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.center}>
          <ShoppingCart size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 12, textAlign: 'center' }}>
            No hay gastos
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
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
  totalCard: {
    marginBottom: 16,
    padding: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  vendor: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontWeight: '700',
    fontSize: 15,
  },
});