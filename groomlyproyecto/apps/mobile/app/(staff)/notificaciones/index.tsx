import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { notificationsService } from '@groomly/shared';
import type { Notification } from '@groomly/shared';
import { useTheme } from '@/contexts/ThemeContext';

export default function NotificacionesPage() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.listNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => {
        if (!item.readAt) {
          markReadMutation.mutate(item.id);
        }
      }}
      activeOpacity={0.7}
    >
      <Card style={[styles.card, { backgroundColor: !item.readAt ? `${colors.primary}08` : colors.surface }]}
      >
        <View style={styles.row}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor: !item.readAt ? colors.primary : colors.surfaceHighlight,
              },
            ]}
          />
          <View style={styles.infoCol}
          >
            <Text style={{ fontWeight: !item.readAt ? '500' : '400', color: !item.readAt ? colors.text : colors.textSecondary }}
            >
              {item.title}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}
            >{item.body}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}
            >
              {new Date(item.createdAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <View style={styles.header}
      >
        <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllReadMutation.mutate()}
            style={styles.markAllBtn}
          >
            <CheckCheck size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, marginLeft: 4 }}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}
        >
          <Text style={{ color: colors.textMuted }}>Cargando notificaciones...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}
        >
          <Bell size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 12, textAlign: 'center' }}>No tienes notificaciones</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
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
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
});