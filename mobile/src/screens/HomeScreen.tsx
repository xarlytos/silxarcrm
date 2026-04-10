import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { mobileApi } from '../lib/api';
import { colors, borderRadius, shadows, spacing } from '../lib/theme';

export default function HomeScreen() {
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
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Resumen ejecutivo</Text>

      {data ? (
        <>
          {/* KPI Cards */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: colors.matcha[800] }]}>
              <Text style={styles.kpiLabel}>MRR</Text>
              <Text style={styles.kpiValue}>{formatCurrency(data.kpis.mrr)}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: colors.slushie[800] }]}>
              <Text style={styles.kpiLabel}>CLIENTES</Text>
              <Text style={styles.kpiValue}>{data.kpis.totalClients}</Text>
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: colors.lemon[500] }]}>
              <Text style={[styles.kpiLabel, { color: colors.black }]}>ARR</Text>
              <Text style={[styles.kpiValue, { color: colors.black }]}>{formatCurrency(data.kpis.arr)}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: colors.pomegranate[400] }]}>
              <Text style={[styles.kpiLabel, { color: colors.black }]}>CHURN</Text>
              <Text style={[styles.kpiValue, { color: colors.black }]}>{data.kpis.avgChurn.toFixed(1)}%</Text>
            </View>
          </View>

          {/* Recent Events */}
          <Text style={styles.sectionTitle}>Actividad Reciente</Text>
          <View style={styles.card}>
            {data.recentEvents?.slice(0, 10).map((event: any) => (
              <View key={event.id} style={styles.eventRow}>
                <View style={[styles.eventBadge, { backgroundColor: getEventBg(event.tipo) }]}>
                  <Text style={styles.eventBadgeText}>
                    {event.tipo.replace(/_/g, ' ').toUpperCase().slice(0, 12)}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.cliente?.nombre || 'Sistema'}</Text>
                  <Text style={styles.eventSaas}>{event.saas}</Text>
                </View>
              </View>
            ))}
            {(!data.recentEvents || data.recentEvents.length === 0) && (
              <Text style={styles.emptyText}>Sin eventos recientes</Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      )}
    </ScrollView>
  );
}

function getEventBg(tipo: string): string {
  const map: Record<string, string> = {
    nuevo_registro: colors.matcha[600],
    pago_exitoso: colors.lemon[500],
    pago_fallido: colors.pomegranate[400],
    cancelacion: colors.pomegranate[400],
    upgrade_plan: colors.slushie[500],
    trial_expirado: colors.lemon[700],
  };
  return map[tipo] || colors.oat.DEFAULT;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg },
  title: { fontSize: 32, fontWeight: '600', color: colors.black, letterSpacing: -0.64 },
  subtitle: { fontSize: 14, color: colors.warm.silver, marginBottom: spacing.lg },
  kpiRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  kpiCard: {
    flex: 1,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    ...shadows.clay,
  },
  kpiLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.08, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  kpiValue: { fontSize: 24, fontWeight: '600', color: colors.white },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.black, marginTop: spacing.xl, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.oat.DEFAULT,
    overflow: 'hidden',
    ...shadows.clay,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.oat.light,
    gap: spacing.md,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 11,
  },
  eventBadgeText: { fontSize: 9, fontWeight: '600', color: colors.white },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 14, fontWeight: '500', color: colors.black },
  eventSaas: { fontSize: 12, color: colors.warm.silver },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { color: colors.warm.silver },
  emptyText: { padding: spacing.lg, textAlign: 'center', color: colors.warm.silver },
});
