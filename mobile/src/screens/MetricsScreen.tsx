import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { mobileApi } from '../lib/api';
import { colors, borderRadius, shadows, spacing } from '../lib/theme';

export default function MetricsScreen() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await mobileApi.getDashboard();
      setData(res.data);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.matcha[600]} />}
    >
      <Text style={styles.title}>Metricas</Text>

      {data ? (
        <>
          {/* Summary Cards */}
          <View style={styles.card}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>MRR Actual</Text>
              <Text style={[styles.metricValue, { color: colors.matcha[600] }]}>
                {formatCurrency(data.kpis.mrr)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>ARR Proyectado</Text>
              <Text style={[styles.metricValue, { color: colors.lemon[700] }]}>
                {formatCurrency(data.kpis.arr)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Clientes Activos</Text>
              <Text style={[styles.metricValue, { color: colors.slushie[800] }]}>
                {data.kpis.totalClients}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Churn Rate</Text>
              <Text style={[styles.metricValue, { color: colors.pomegranate[400] }]}>
                {data.kpis.avgChurn.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* SaaS Breakdown */}
          {data.bySaas?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Por SaaS</Text>
              <View style={styles.card}>
                {data.bySaas.map((saas: any, i: number) => (
                  <View key={saas.saas}>
                    <View style={styles.saasRow}>
                      <Text style={styles.saasName}>{saas.saas}</Text>
                      <Text style={styles.saasMrr}>{formatCurrency(Number(saas.mrr))}</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.min((Number(saas.mrr) / (data.kpis.mrr || 1)) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                    {i < data.bySaas.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando metricas...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg },
  title: { fontSize: 32, fontWeight: '600', color: colors.black, letterSpacing: -0.64, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.black, marginTop: spacing.xl, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.oat.DEFAULT,
    padding: spacing.lg,
    ...shadows.clay,
  },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  metricLabel: { fontSize: 14, color: colors.warm.charcoal },
  metricValue: { fontSize: 20, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.oat.light },
  saasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  saasName: { fontSize: 14, fontWeight: '500', color: colors.black, textTransform: 'capitalize' },
  saasMrr: { fontSize: 14, fontWeight: '600', fontFamily: 'monospace', color: colors.matcha[600] },
  barBg: { height: 6, backgroundColor: colors.oat.light, borderRadius: 3, marginBottom: 8 },
  barFill: { height: 6, backgroundColor: colors.matcha[600], borderRadius: 3 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { color: colors.warm.silver },
});
