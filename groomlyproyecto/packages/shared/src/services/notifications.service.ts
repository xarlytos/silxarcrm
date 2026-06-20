import { getApi } from '../api/client';
import type { Notification } from '../types/api';

export async function listNotifications(unreadOnly?: boolean) {
  const { data } = await getApi().get<{ data: Notification[] }>(
    '/communications/notifications',
    {
      params: unreadOnly ? { unread: 'true' } : undefined,
    },
  );
  return data.data;
}

export async function getUnreadSummary() {
  const { data } = await getApi().get<{ count: number }>(
    '/communications/notifications/unread-summary',
  );
  return data.count;
}

export async function markNotificationAsRead(id: string) {
  const { data } = await getApi().patch<{ notification: Notification }>(
    `/communications/notifications/${id}/read`,
  );
  return data.notification;
}

export async function markAllNotificationsAsRead() {
  const { data } = await getApi().patch<{ count: number }>(
    '/communications/notifications/read-all',
  );
  return data.count;
}

export async function registerPushToken(token: string) {
  const { data } = await getApi().post<{ message: string }>(
    '/communications/push-token',
    { token },
  );
  return data;
}
