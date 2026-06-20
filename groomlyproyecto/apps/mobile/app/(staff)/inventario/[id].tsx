import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { inventoryService, extractErrorMessage } from '@groomly/shared';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowLeft,
  Trash2,
  History,
} from 'lucide-react-native';

const INVENTORY_CATEGORY_LABELS: Record<string, string> = {
  other: 'Otro',
  food: 'Alimento',
  grooming: 'Peluquería',
  health: 'Salud',
  accessories: 'Accesorios',
  toys: 'Juguetes',
};

export default function InventoryDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryService.getInventoryItem(id as string),
  });

  const { data: movementsData } = useQuery({
    queryKey: ['inventory-movements', id],
    queryFn: () => inventoryService.listMovements(id as string),
  });

  const item = data?.item;
  const movements = movementsData?.data ?? [];

  const adjustMutation = useMutation({
    mutationFn: (payload: Parameters<typeof inventoryService.createMovement>[1]) =>
      inventoryService.createMovement(id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-item', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements', id] });
      setAdjustQty('');
      setAdjustReason('');
      setShowAdjust(false);
    },
    onError: (err) => {
      Alert.alert('Error', extractErrorMessage(err));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => inventoryService.deactivateInventoryItem(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      router.back();
    },
  });

  const handleAdjust = () => {
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty === 0) {
      Alert.alert('Error', 'Introduce una cantidad válida');
      return;
    }
    const type = qty > 0 ? 'purchase' : 'adjustment';
    adjustMutation.mutate({
      type,
      quantity: Math.abs(qty),
      notes: adjustReason || 'Ajuste desde app',
    });
  };

  const handleDeactivate = () => {
    Alert.alert('Eliminar producto', `¿Eliminar "${item?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deactivateMutation.mutate(),
      },
    ]);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const getStockStatus = () => {
    if (!item) return { label: '', color: colors.textMuted };
    if (item.stock === 0) return { label: 'Agotado', color: colors.error };
    if (item.stock <= item.minStock) return { label: 'Stock bajo', color: colors.warning };
    return { label: 'En stock', color: colors.success };
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Cargando...</Text>
        </View>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Producto no encontrado</Text>
        </View>
      </Screen>
    );
  }

  const status = getStockStatus();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Producto</Text>
        </View>

        {/* Info card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoContent}>
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
              <Package size={32} color={colors.primary} />
            </View>
            <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.itemCategory, { color: colors.textMuted }]}>
              {INVENTORY_CATEGORY_LABELS[item.category]}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label} · {item.stock} {item.unit}
              </Text>
            </View>
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Precio</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(item.unitPrice)}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Stock mín.</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {item.minStock}
            </Text>
          </Card>
        </View>

        {/* Stock alert */}
        {item.stock <= item.minStock && (
          <Card style={[styles.alertCard, { backgroundColor: `${colors.error}10` }]}>
            <View style={styles.row}>
              <AlertTriangle size={20} color={colors.error} />
              <Text style={[styles.alertText, { color: colors.error }]}>
                Stock bajo: {item.stock} de {item.minStock} {item.unit} mínimos
              </Text>
            </View>
          </Card>
        )}

        {/* Adjust stock */}
        {showAdjust ? (
          <Card style={styles.adjustCard}>
            <Text style={[styles.adjustTitle, { color: colors.text }]}>Ajustar stock</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 12 }}>
              Stock actual: {item.stock} {item.unit}
            </Text>
            <View style={{ gap: 12, marginBottom: 12 }}>
              <TextInput
                placeholder="Cantidad (+ añade, - quita)"
                keyboardType="number-pad"
                value={adjustQty}
                onChangeText={setAdjustQty}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                placeholder="Motivo (opcional)"
                value={adjustReason}
                onChangeText={setAdjustReason}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Button onPress={handleAdjust} isLoading={adjustMutation.isPending} style={{ marginBottom: 8 }}>
              Ajustar stock
            </Button>
            <Button variant="ghost" onPress={() => setShowAdjust(false)}>
              Cancelar
            </Button>
          </Card>
        ) : (
          <View style={{ marginBottom: 16 }}>
            <Button onPress={() => setShowAdjust(true)}>
              <View style={styles.row}>
                <TrendingUp size={18} color="#fff" />
                <Text style={styles.btnTextWhite}>Ajustar stock</Text>
              </View>
            </Button>
          </View>
        )}

        {/* Movements */}
        <View style={styles.row}>
          <History size={18} color={colors.textMuted} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Últimos movimientos</Text>
        </View>

        {movements.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 16 }}>
            Sin movimientos registrados
          </Text>
        ) : (
          movements.slice(0, 10).map((m) => (
            <Card key={m.id} style={styles.movementCard}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  {m.quantity >= 0 ? (
                    <TrendingUp size={16} color={colors.success} />
                  ) : (
                    <TrendingDown size={16} color={colors.error} />
                  )}
                  <View style={{ marginLeft: 8 }}>
                    <Text style={[styles.movementType, { color: colors.text }]}>
                      {m.type}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {new Date(m.createdAt).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: m.quantity >= 0 ? colors.success : colors.error, fontWeight: '700' }}>
                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                </Text>
              </View>
              {m.notes && (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  {m.notes}
                </Text>
              )}
            </Card>
          ))
        )}

        {/* Delete */}
        <Button variant="outline" onPress={handleDeactivate} style={{ marginTop: 16, marginBottom: 24 }}>
          <View style={styles.row}>
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar producto</Text>
          </View>
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
  },
  itemCategory: {
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
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
  statValue: {
    fontWeight: '700',
    fontSize: 18,
    marginTop: 4,
  },
  alertCard: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: {
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14,
  },
  adjustCard: {
    marginBottom: 16,
  },
  adjustTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 12,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  btnTextWhite: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    marginBottom: 8,
  },
  movementCard: {
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movementType: {
    fontWeight: '500',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  deleteText: {
    marginLeft: 8,
  },
});