import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { mobileApi } from '../lib/api';
import { colors, borderRadius, shadows, spacing } from '../lib/theme';

export default function ActivityScreen() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('');

  const fetchEventos = useCallback(async (p = 1) => {
    try {
      const params: Record<string, string> = { page: String(p) };
      if (filter) params.severidad = filter;
      const res = await mobileApi.getEventos(params);
      if (p === 1) {
        setEventos(res.data.eventos);
      } else {
        setEventos((prev) => [...prev, ...res.data.eventos]);
      }
      setPage(p);
    } catch {}
  }, [filter]);

  useEffect(() => { fetchEventos(1); }, [fetchEventos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEventos(1);
    setRefreshing(false);
  };

  const renderEvent = ({ item }: { item: any }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={[styles.badge, { backgroundColor: getEventBg(item.tipo) }]}>
          <Text style={styles.badgeText}>{item.tipo.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
        <Text style={styles.time}>{new Date(item.fecha).toLocaleString('es-ES')}</Text>
      </View>
      <Text style={styles.clientName}>{item.cliente?.nombre || 'Sistema'}</Text>
      <View style={styles.eventMeta}>
        <Text style={styles.saas}>{item.saas}</Text>
        <Text style={[styles.severity, item.severidad === 'critico' && styles.severityCritical]}>
          {item.severidad}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Actividad</Text>

      {/* Filter */}
      <View style={styles.filterRow}>
        {['', 'info', 'critico'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f || 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={eventos}
        renderItem={renderEvent}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.matcha[600]} />
        }
        onEndReached={() => fetchEventos(page + 1)}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
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
  container: { flex: 1, backgroundColor: colors.cream, padding: spacing.lg },
  title: { fontSize: 32, fontWeight: '600', color: colors.black, letterSpacing: -0.64, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 1584,
    borderWidth: 1,
    borderColor: colors.oat.DEFAULT,
    backgroundColor: colors.white,
  },
  filterBtnActive: { backgroundColor: colors.black, borderColor: colors.black },
  filterText: { fontSize: 13, fontWeight: '500', color: colors.warm.charcoal },
  filterTextActive: { color: colors.white },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.oat.DEFAULT,
    padding: spacing.lg,
    ...shadows.clay,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 11 },
  badgeText: { fontSize: 9, fontWeight: '600', color: colors.white },
  time: { fontSize: 11, color: colors.warm.silver },
  clientName: { fontSize: 15, fontWeight: '500', color: colors.black, marginBottom: 4 },
  eventMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  saas: { fontSize: 12, color: colors.warm.silver, textTransform: 'capitalize' },
  severity: { fontSize: 12, color: colors.warm.charcoal },
  severityCritical: { color: colors.pomegranate[400], fontWeight: '600' },
});
