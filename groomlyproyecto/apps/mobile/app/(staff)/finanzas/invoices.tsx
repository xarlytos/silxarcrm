import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { invoicesService } from '@groomly/shared';
import type { Invoice } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

type InvoiceFilter = 'all' | 'pending' | 'paid' | 'overdue';

const filters: { key: InvoiceFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'paid', label: 'Pagadas' },
  { key: 'overdue', label: 'Vencidas' },
];

export default function InvoicesListPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<InvoiceFilter>('all');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['invoices', activeFilter],
    queryFn: () =>
      invoicesService.listInvoices({
        status: activeFilter === 'all' ? undefined : activeFilter,
        limit: 50,
      }),
  });

  const invoices = data?.data ?? [];
  const totals = data?.totals;

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return { bg: `${colors.success}18`, text: colors.success, label: 'Pagada' };
      case 'overdue': return { bg: `${colors.error}18`, text: colors.error, label: 'Vencida' };
      case 'partial': return { bg: `${colors.primary}18`, text: colors.primary, label: 'Parcial' };
      default: return { bg: `${colors.warning}18`, text: colors.warning, label: 'Pendiente' };
    }
  };

  const renderItem = ({ item }: { item: Invoice }) => {
    const status = getStatusStyle(item.status);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(staff)/finanzas/invoices/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.infoCol}>
              <Text style={[styles.invoiceNum, { color: colors.text }]}>
                {item.number || 'Sin número'}
              </Text>
              <Text style={[styles.customer, { color: colors.textMuted }]}>
                {item.customer?.fullName}
              </Text>
              <Text style={[styles.date, { color: colors.textMuted }]}>
                {item.issueDate}
              </Text>
            </View>
            <View style={styles.amountCol}>
              <Text style={[styles.amount, { color: colors.text }]}>
                {formatCurrency(item.total)}
              </Text>
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>
          </View>
          {item.balanceDue > 0 && (
            <Text style={[styles.balanceDue, { color: colors.textMuted }]}>
              Pendiente: {formatCurrency(item.balanceDue)}
            </Text>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>Facturas</Text>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[
              styles.filterButton,
              {
                backgroundColor: activeFilter === f.key ? colors.primary : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === f.key ? '#0A0B10' : colors.text },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Totals */}
      {totals && (
        <View style={styles.totalsRow}>
          <View style={[styles.totalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Total</Text>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
              {formatCurrency(totals.total)}
            </Text>
          </View>
          <View style={[styles.totalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Pagado</Text>
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 16 }}>
              {formatCurrency(totals.paidAmount)}
            </Text>
          </View>
          <View style={[styles.totalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Pendiente</Text>
            <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 16 }}>
              {formatCurrency(totals.balanceDue)}
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Cargando facturas...</Text>
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.center}>
          <FileText size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 12, textAlign: 'center' }}>
            No hay facturas
          </Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  totalBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
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
  invoiceNum: {
    fontSize: 15,
    fontWeight: '500',
  },
  customer: {
    fontSize: 13,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontWeight: '700',
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  balanceDue: {
    fontSize: 12,
    marginTop: 4,
  },
});