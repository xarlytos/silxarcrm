import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  ShoppingCart,
} from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { financeService, invoicesService, expensesService, ymd, startOfMonth, endOfMonth } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function FinanzasDashboard() {
  const router = useRouter();
  const { colors } = useTheme();

  const now = new Date();
  const from = ymd(startOfMonth(now));
  const to = ymd(endOfMonth(now));

  const { data: dashboard } = useQuery({
    queryKey: ['finance-dashboard', from, to],
    queryFn: () => financeService.getFinanceDashboard({ from, to }),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-recent'],
    queryFn: () => invoicesService.listInvoices({ limit: 5 }),
  });

  const { data: expensesData } = useQuery({
    queryKey: ['expenses-recent'],
    queryFn: () => expensesService.listExpenses({ limit: 5 }),
  });

  const revenue = dashboard?.revenue.total ?? 0;
  const expenses = dashboard?.expenses.total ?? 0;
  const profit = dashboard?.profit ?? 0;
  const pendingAmount = dashboard?.pendingAmount ?? 0;

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

  const kpiCards = [
    {
      label: 'Ingresos',
      value: formatCurrency(revenue),
      icon: TrendingUp,
      color: colors.success,
      bgColor: `${colors.success}15`,
    },
    {
      label: 'Gastos',
      value: formatCurrency(expenses),
      icon: TrendingDown,
      color: colors.error,
      bgColor: `${colors.error}15`,
    },
    {
      label: 'Beneficio',
      value: formatCurrency(profit),
      icon: DollarSign,
      color: profit >= 0 ? colors.success : colors.error,
      bgColor: profit >= 0 ? `${colors.success}15` : `${colors.error}15`,
    },
    {
      label: 'Pendiente',
      value: formatCurrency(pendingAmount),
      icon: FileText,
      color: colors.warning,
      bgColor: `${colors.warning}15`,
    },
  ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Finanzas</Text>

        {/* Period */}
        <Text style={[styles.period, { color: colors.textMuted }]}>
          {now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </Text>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {kpiCards.map((kpi, i) => (
            <View key={i} style={styles.kpiHalf}>
              <Card style={styles.kpiCard}>
                <View style={[styles.kpiIcon, { backgroundColor: kpi.bgColor }]}>
                  <kpi.icon size={20} color={kpi.color} />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{kpi.label}</Text>
                <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1}>
                  {kpi.value}
                </Text>
              </Card>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Acciones</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => router.push('/(staff)/finanzas/invoices')}
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}12` }]}>
              <FileText size={24} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Facturas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(staff)/finanzas/expenses')}
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${colors.error}12` }]}>
              <ShoppingCart size={24} color={colors.error} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Gastos</Text>
          </TouchableOpacity>
        </View>

        {/* Top services */}
        {dashboard?.topServices && dashboard.topServices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Servicios más vendidos</Text>
            <Card style={styles.servicesCard}>
              {dashboard.topServices.map((svc, i) => (
                <View
                  key={i}
                  style={[
                    styles.serviceRow,
                    { borderBottomColor: colors.border },
                    i === dashboard.topServices.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={[styles.serviceName, { color: colors.text }]}>{svc.name}</Text>
                  <Text style={[styles.serviceCount, { color: colors.textMuted }]}>{svc.count} citas</Text>
                  <Text style={[styles.serviceRevenue, { color: colors.primary }]}>
                    {formatCurrency(svc.revenue)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Recent invoices */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Facturas recientes</Text>
          <TouchableOpacity onPress={() => router.push('/(staff)/finanzas/invoices')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {invoicesData?.data.length === 0 ? (
          <Card style={styles.emptyCard}>
            <FileText size={32} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>No hay facturas</Text>
          </Card>
        ) : (
          <View style={{ marginBottom: 24 }}>
            {invoicesData?.data.slice(0, 3).map((inv) => {
              const status = getStatusStyle(inv.status);
              return (
                <TouchableOpacity
                  key={inv.id}
                  onPress={() => router.push(`/(staff)/finanzas/invoices/${inv.id}`)}
                >
                  <Card style={styles.invoiceCard}>
                    <View style={styles.rowBetween}>
                      <View style={styles.infoCol}>
                        <Text style={[styles.invoiceNum, { color: colors.text }]}>
                          {inv.number || 'Sin número'}
                        </Text>
                        <Text style={[styles.invoiceCustomer, { color: colors.textMuted }]}>
                          {inv.customer?.fullName}
                        </Text>
                      </View>
                      <View style={styles.amountCol}>
                        <Text style={[styles.invoiceAmount, { color: colors.text }]}>
                          {formatCurrency(inv.total)}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent expenses */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gastos recientes</Text>
          <TouchableOpacity onPress={() => router.push('/(staff)/finanzas/expenses')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {expensesData?.data.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ShoppingCart size={32} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>No hay gastos</Text>
          </Card>
        ) : (
          <View style={{ marginBottom: 24 }}>
            {expensesData?.data.slice(0, 3).map((exp) => (
              <Card key={exp.id} style={styles.expenseCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.infoCol}>
                    <Text style={[styles.expenseDesc, { color: colors.text }]}>{exp.description}</Text>
                    <Text style={[styles.expenseDetail, { color: colors.textMuted }]}>
                      {expensesService.EXPENSE_CATEGORY_LABELS[exp.category]} · {exp.date}
                    </Text>
                  </View>
                  <Text style={[styles.expenseAmount, { color: colors.error }]}>
                    -{formatCurrency(exp.amount)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
  period: {
    fontSize: 14,
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiHalf: {
    width: '48%',
  },
  kpiCard: {
    paddingVertical: 16,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  kpiValue: {
    fontWeight: '700',
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
  },
  servicesCard: {
    marginBottom: 24,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  serviceName: {
    flex: 1,
    fontSize: 14,
  },
  serviceCount: {
    marginRight: 12,
    fontSize: 13,
  },
  serviceRevenue: {
    fontWeight: '500',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  invoiceCard: {
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
  invoiceCustomer: {
    fontSize: 13,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
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
  expenseCard: {
    marginBottom: 8,
  },
  expenseDesc: {
    fontSize: 15,
    fontWeight: '500',
  },
  expenseDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  expenseAmount: {
    fontWeight: '700',
    fontSize: 15,
  },
});