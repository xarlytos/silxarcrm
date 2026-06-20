import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, User, Calendar, DollarSign, Check, X, Printer } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { invoicesService, extractErrorMessage, PAYMENT_METHOD_LABELS } from '@groomly/shared';
import type { PaymentMethod } from '@groomly/shared';

export default function InvoiceDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesService.getInvoice(id as string),
  });

  const paymentMutation = useMutation({
    mutationFn: (payload: { amount: number; method: PaymentMethod }) =>
      invoicesService.registerPayment(id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowPaymentForm(false);
      setPaymentAmount('');
    },
    onError: (err) => {
      Alert.alert('Error', extractErrorMessage(err));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => invoicesService.cancelInvoice(id as string, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      router.back();
    },
  });

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: `${colors.warning}18`, text: colors.warning, label: 'Pendiente' };
      case 'paid': return { bg: `${colors.success}18`, text: colors.success, label: 'Pagada' };
      case 'partial': return { bg: `${colors.primary}18`, text: colors.primary, label: 'Parcial' };
      case 'overdue': return { bg: `${colors.error}18`, text: colors.error, label: 'Vencida' };
      case 'cancelled': return { bg: `${colors.textMuted}18`, text: colors.textMuted, label: 'Cancelada' };
      default: return { bg: `${colors.warning}18`, text: colors.warning, label: 'Pendiente' };
    }
  };

  const handleExportPDF = async () => {
    if (!invoice) return;
    const s = getStatusStyle(invoice.status);
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1f1f2c; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 28px; margin-bottom: 8px; color: #00D4FF; }
            .header p { color: #85859c; font-size: 14px; }
            .status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 10px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 12px; text-transform: uppercase; color: #85859c; font-weight: 600; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f5; }
            .label { color: #85859c; }
            .value { font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; padding: 10px; background: #f7f5ff; font-size: 12px; text-transform: uppercase; color: #66667e; }
            td { padding: 10px; border-bottom: 1px solid #f0f0f5; }
            .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px solid #00D4FF; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .grand-total { font-size: 20px; font-weight: bold; color: #00D4FF; }
            .footer { margin-top: 40px; text-align: center; color: #b0b0c0; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Factura</h1>
            <p>${invoice.number || 'Sin número'}</p>
            <div class="status" style="background: ${s.bg}; color: ${s.text};">
              ${s.label}
            </div>
            <h2 style="margin-top: 16px; font-size: 32px;">${formatCurrency(invoice.total)}</h2>
          </div>

          <div class="section">
            <div class="section-title">Información</div>
            <div class="info-row"><span class="label">Cliente</span><span class="value">${invoice.customer?.fullName || ''}</span></div>
            <div class="info-row"><span class="label">Fecha emisión</span><span class="value">${invoice.issueDate}</span></div>
            <div class="info-row"><span class="label">Vencimiento</span><span class="value">${invoice.dueDate}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Conceptos</div>
            <table>
              <tr><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr>
              ${invoice.lines?.map(l => `<tr><td>${l.description}</td><td>${l.quantity}</td><td>${formatCurrency(l.unitPrice)}</td><td>${formatCurrency(l.total)}</td></tr>`).join('') || ''}
            </table>
          </div>

          <div class="total-section">
            <div class="total-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
            ${invoice.taxAmount > 0 ? `<div class="total-row"><span>IVA (${invoice.taxRate}%)</span><span>${formatCurrency(invoice.taxAmount)}</span></div>` : ''}
            ${invoice.irpfAmount > 0 ? `<div class="total-row"><span>IRPF</span><span>-${formatCurrency(invoice.irpfAmount)}</span></div>` : ''}
            ${invoice.discountAmount > 0 ? `<div class="total-row"><span>Descuento</span><span style="color: #22c55e;">-${formatCurrency(invoice.discountAmount)}</span></div>` : ''}
            <div class="total-row grand-total"><span>Total</span><span>${formatCurrency(invoice.total)}</span></div>
          </div>

          ${invoice.payments && invoice.payments.length > 0 ? `
          <div class="section" style="margin-top: 24px;">
            <div class="section-title">Pagos recibidos</div>
            ${invoice.payments.map(p => `<div class="info-row"><span class="label">${PAYMENT_METHOD_LABELS[p.method] || p.method}</span><span class="value" style="color: #22c55e;">${formatCurrency(p.amount)}</span></div>`).join('')}
            <div class="info-row" style="border-top: 2px solid #f0f0f5; margin-top: 8px; padding-top: 8px;">
              <span class="label">Pagado</span><span class="value" style="color: #22c55e;">${formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div class="info-row">
              <span class="label">Pendiente</span><span class="value" style="color: #f59e0b;">${formatCurrency(invoice.balanceDue)}</span>
            </div>
          </div>
          ` : ''}

          <div class="footer">
            Generado con peluguau · peluguau.com
          </div>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Factura ${invoice.number}` });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo generar el PDF');
    }
  };

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Introduce un importe válido');
      return;
    }
    if (invoice && amount > invoice.balanceDue) {
      Alert.alert('Error', 'El importe no puede superar el saldo pendiente');
      return;
    }
    paymentMutation.mutate({ amount, method: selectedPaymentMethod });
  };

  const handleCancel = () => {
    Alert.alert('Cancelar factura', '¿Estás seguro?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: () => cancelMutation.mutate('Cancelada desde la app'),
      },
    ]);
  };

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Cargando...</Text>
      </Screen>
    );
  }

  if (!invoice) {
    return (
      <Screen style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Factura no encontrada</Text>
      </Screen>
    );
  }

  const s = getStatusStyle(invoice.status);
  const canPay = invoice.status === 'pending' || invoice.status === 'partial' || invoice.status === 'overdue';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
          </View>
          <Text style={[styles.totalAmount, { color: colors.text }]}>
            {formatCurrency(invoice.total)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>
            {invoice.number || 'Sin número'}
          </Text>
        </View>

        {/* Info */}
        <Card style={styles.card}>
          <View style={{ gap: 12 }}>
            <View style={styles.row}>
              <User size={18} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Cliente</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{invoice.customer?.fullName}</Text>
            </View>
            <View style={styles.row}>
              <Calendar size={18} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Fecha emisión</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{invoice.issueDate}</Text>
            </View>
            <View style={styles.row}>
              <Calendar size={18} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Vencimiento</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{invoice.dueDate}</Text>
            </View>
          </View>
        </Card>

        {/* Lines */}
        <Card style={styles.card}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Conceptos</Text>
          {invoice.lines?.map((line) => (
            <View key={line.id} style={[styles.lineRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoCol}>
                <Text style={{ color: colors.text, fontSize: 14 }}>{line.description}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  {line.quantity} x {formatCurrency(line.unitPrice)}
                </Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: '500', fontSize: 14 }}>
                {formatCurrency(line.total)}
              </Text>
            </View>
          ))}
          <View style={[styles.totalsSection, { borderTopColor: colors.border }]}>
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Subtotal</Text>
              <Text style={{ color: colors.text, fontSize: 14 }}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.taxAmount > 0 && (
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>IVA ({invoice.taxRate}%)</Text>
                <Text style={{ color: colors.text, fontSize: 14 }}>{formatCurrency(invoice.taxAmount)}</Text>
              </View>
            )}
            {invoice.irpfAmount > 0 && (
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>IRPF</Text>
                <Text style={{ color: colors.text, fontSize: 14 }}>-{formatCurrency(invoice.irpfAmount)}</Text>
              </View>
            )}
            {invoice.discountAmount > 0 && (
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Descuento</Text>
                <Text style={{ color: colors.success, fontSize: 14 }}>-{formatCurrency(invoice.discountAmount)}</Text>
              </View>
            )}
            <View style={[styles.rowBetween, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Total</Text>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 20 }}>
                {formatCurrency(invoice.total)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Payments */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Pagos recibidos</Text>
            {invoice.payments.map((p) => (
              <View key={p.id} style={[styles.lineRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={{ color: colors.text, fontSize: 14 }}>
                    {PAYMENT_METHOD_LABELS[p.method] || p.method}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{p.receivedAt}</Text>
                </View>
                <Text style={{ color: colors.success, fontWeight: '500', fontSize: 14 }}>
                  {formatCurrency(p.amount)}
                </Text>
              </View>
            ))}
            <View style={[styles.rowBetween, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Pagado</Text>
              <Text style={{ color: colors.success, fontWeight: '500', fontSize: 14 }}>
                {formatCurrency(invoice.paidAmount)}
              </Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Pendiente</Text>
              <Text style={{ color: colors.warning, fontWeight: '500', fontSize: 14 }}>
                {formatCurrency(invoice.balanceDue)}
              </Text>
            </View>
          </Card>
        )}

        {/* Payment form */}
        {showPaymentForm && canPay && (
          <Card style={styles.card}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Registrar pago</Text>
            <View style={{ gap: 12 }}>
              <TextInput
                placeholder="Importe"
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Máximo: {formatCurrency(invoice.balanceDue)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>Método de pago</Text>
              <View style={styles.paymentMethods}>
                {(['cash', 'card', 'transfer', 'bizum'] as PaymentMethod[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setSelectedPaymentMethod(m)}
                    style={[
                      styles.paymentMethod,
                      {
                        backgroundColor: selectedPaymentMethod === m ? colors.primary : colors.surface,
                        borderColor: selectedPaymentMethod === m ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: selectedPaymentMethod === m ? '#0A0B10' : colors.text, fontSize: 13 }}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button onPress={handlePayment} isLoading={paymentMutation.isPending}>
                Registrar pago
              </Button>
              <Button variant="ghost" onPress={() => setShowPaymentForm(false)}>
                Cancelar
              </Button>
            </View>
          </Card>
        )}

        {/* Actions */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          <Button variant="outline" onPress={handleExportPDF}>
            <View style={styles.row}>
              <Printer size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Exportar PDF</Text>
            </View>
          </Button>
          {canPay && !showPaymentForm && (
            <Button onPress={() => setShowPaymentForm(true)}>
              <View style={styles.row}>
                <DollarSign size={18} color="#fff" />
                <Text style={styles.btnTextWhite}>Registrar pago</Text>
              </View>
            </Button>
          )}
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <Button variant="outline" onPress={handleCancel}>
              <View style={styles.row}>
                <X size={18} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Cancelar factura</Text>
              </View>
            </Button>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: '700',
    fontSize: 28,
    marginTop: 12,
  },
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  infoValue: {
    fontWeight: '500',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  totalsSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethod: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  btnTextWhite: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});