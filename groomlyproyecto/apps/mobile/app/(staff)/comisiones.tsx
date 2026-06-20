import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { commissionsService, ymd } from '@groomly/shared';
import { Percent, TrendingUp, Calendar, Wallet, CheckCircle2, X } from 'lucide-react-native';

export default function ComisionesPage() {
  const today = ymd(new Date());
  const monthStart = today.slice(0, 7) + '-01';
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedGroomer, setSelectedGroomer] = useState<{
    groomerId: string;
    groomerName: string;
    pendingAmount: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>('transfer');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['commissions-summary', period],
    queryFn: () => commissionsService.getCommissionSummary({
      from: monthStart,
      to: today,
    }),
  });

  const { data: pendingCommissions } = useQuery({
    queryKey: ['commissions-pending', period],
    queryFn: () => commissionsService.listCommissions({
      from: monthStart,
      to: today,
      status: 'pending',
    }),
    enabled: !!data,
  });

  const payMutation = useMutation({
    mutationFn: commissionsService.payCommissionsBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions-summary'] });
      queryClient.invalidateQueries({ queryKey: ['commissions-pending'] });
      setShowPayModal(false);
      setSelectedGroomer(null);
      Alert.alert('Éxito', 'Comisiones pagadas correctamente');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'No se pudieron pagar las comisiones');
    },
  });

  const summary = data;
  const byGroomer = summary?.byGroomer ?? [];
  const totals = summary?.totals;
  const pendingList = pendingCommissions?.data ?? [];

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const handlePayGroomer = (groomer: typeof byGroomer[0]) => {
    const ids = pendingList
      .filter((c) => c.groomerId === groomer.groomerId)
      .map((c) => c.id);

    if (ids.length === 0) {
      Alert.alert('Sin comisiones', 'No hay comisiones pendientes para este peluquero');
      return;
    }

    setSelectedGroomer({
      groomerId: groomer.groomerId,
      groomerName: groomer.groomerName,
      pendingAmount: groomer.pendingAmount,
    });
    setShowPayModal(true);
  };

  const confirmPayment = () => {
    if (!selectedGroomer) return;
    const ids = pendingList
      .filter((c) => c.groomerId === selectedGroomer.groomerId)
      .map((c) => c.id);

    payMutation.mutate({
      ids,
      paymentMethod: paymentMethod || undefined,
    });
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>Comisiones</Text>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {(['month', 'quarter', 'year'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodButton,
                { backgroundColor: period === p ? colors.primary : colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: period === p ? '#0A0B10' : colors.text },
                ]}
              >
                {p === 'month' ? 'Mes' : p === 'quarter' ? 'Trimestre' : 'Año'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={[styles.kpiValue, { color: colors.primary }]}>
              {totals ? formatCurrency(totals.totalAmount) : '—'}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Total comisiones</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Wallet size={20} color={colors.success} />
            <Text style={[styles.kpiValue, { color: colors.success }]}>
              {totals ? formatCurrency(totals.pendingAmount) : '—'}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Pendiente</Text>
          </Card>
        </View>

        {/* Period */}
        <View style={styles.periodInfo}>
          <Calendar size={16} color={colors.textMuted} />
          <Text style={[styles.periodInfoText, { color: colors.textMuted }]}>
            {today.slice(0, 7)} · {totals?.groomerCount ?? 0} peluqueros
          </Text>
        </View>

        {/* Groomers list */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Por peluquero</Text>

        {isLoading ? (
          <View style={styles.center}>
            <Text style={{ color: colors.textMuted }}>Cargando...</Text>
          </View>
        ) : byGroomer.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Percent size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay comisiones este período</Text>
          </Card>
        ) : (
          byGroomer.map((g) => (
            <Card key={g.groomerId} style={styles.groomerCard}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.groomerDot,
                    { backgroundColor: g.color || colors.primary },
                  ]}
                />
                <View style={styles.infoCol}>
                  <Text style={[styles.groomerName, { color: colors.text }]}>{g.groomerName}</Text>
                  <Text style={[styles.groomerDetail, { color: colors.textMuted }]}>
                    {g.appointments} citas · {formatCurrency(g.revenue)} ingresos
                  </Text>
                </View>
                <View style={styles.amountCol}>
                  <Text style={[styles.amount, { color: colors.primary }]}>
                    {formatCurrency(g.totalAmount)}
                  </Text>
                  <Text style={[styles.amountLabel, { color: colors.textMuted }]}>comisión</Text>
                </View>
              </View>

              {/* Breakdown */}
              <View style={[styles.breakdown, { borderTopColor: colors.border }]}>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.warning }]}>
                    {formatCurrency(g.pendingAmount)}
                  </Text>
                  <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Pendiente</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.success }]}>
                    {formatCurrency(g.paidAmount)}
                  </Text>
                  <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Pagado</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: colors.error }]}>
                    {formatCurrency(g.cancelledAmount)}
                  </Text>
                  <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Cancelado</Text>
                </View>
              </View>

              {/* Pay button */}
              {g.pendingAmount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => handlePayGroomer(g)}
                  style={{ marginTop: 12 }}
                >
                  <View style={styles.row}>
                    <Wallet size={16} color={colors.success} />
                    <Text style={{ color: colors.success, marginLeft: 8, fontWeight: '500' }}>
                      Pagar {formatCurrency(g.pendingAmount)}
                    </Text>
                  </View>
                </Button>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Pay Modal */}
      <Modal
        visible={showPayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Pagar comisiones</Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedGroomer && (
              <>
                <Text style={[styles.modalInfo, { color: colors.textMuted }]}>
                  Peluquero: <Text style={{ color: colors.text, fontWeight: '500' }}>{selectedGroomer.groomerName}</Text>{'\n'}
                  Importe: <Text style={{ color: colors.success, fontWeight: '700' }}>{formatCurrency(selectedGroomer.pendingAmount)}</Text>
                </Text>

                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                  Método de pago
                </Text>
                <View style={styles.paymentMethods}>
                  {['cash', 'transfer', 'bizum', 'card'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setPaymentMethod(m)}
                      style={[
                        styles.paymentMethod,
                        {
                          backgroundColor: paymentMethod === m ? colors.success : colors.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentMethodText,
                          { color: paymentMethod === m ? '#fff' : colors.text },
                        ]}
                      >
                        {m === 'cash' ? 'Efectivo'
                          : m === 'transfer' ? 'Transferencia'
                          : m === 'bizum' ? 'Bizum'
                          : 'Tarjeta'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button
                  onPress={confirmPayment}
                  isLoading={payMutation.isPending}
                  size="lg"
                >
                  <View style={styles.row}>
                    <CheckCircle2 size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>
                      Confirmar pago
                    </Text>
                  </View>
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodText: {
    fontWeight: '500',
    fontSize: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  kpiValue: {
    fontWeight: '700',
    fontSize: 18,
    marginTop: 4,
  },
  kpiLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  periodInfoText: {
    fontSize: 13,
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  groomerCard: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groomerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  groomerName: {
    fontSize: 15,
    fontWeight: '500',
  },
  groomerDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontWeight: '700',
    fontSize: 15,
  },
  amountLabel: {
    fontSize: 11,
  },
  breakdown: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownValue: {
    fontWeight: '700',
    fontSize: 14,
  },
  breakdownLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalInfo: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 22,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  paymentMethod: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  paymentMethodText: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
});