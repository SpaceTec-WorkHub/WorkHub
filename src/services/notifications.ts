import { apiRequest } from './api';

export type BackendNotification = {
  notification_id: number;
  title: string;
  content: string;
  reason: string;
  user_id: number;
  createdAt?: string;
  time?: string;
};

export type UiNotification = {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'reservation' | 'reminder' | 'car' | 'system';
};

const MONTERREY_OFFSET_MS = 6 * 60 * 60 * 1000;

function parseNotificationDate(createdAt: string) {
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(createdAt);

  if (hasTimezone) {
    return new Date(createdAt);
  }

  return new Date(`${createdAt}Z`);
}

function mapReasonToType(reason: string): UiNotification['type'] {
  if (reason.includes('reservation') || reason === 'no_show' || reason === 'checkout_pending') {
    return 'reservation';
  }

  if (reason.includes('password')) {
    return 'system';
  }

  if (reason.includes('carpool')) {
    return 'car';
  }

  if (reason === 'block') {
    return 'reminder';
  }

  return 'system';
}

function formatNotificationTime(createdAt?: string) {
  if (!createdAt) {
    return 'Ahora';
  }

  const parsedDate = parseNotificationDate(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Ahora';
  }

  const monterreyDate = new Date(parsedDate.getTime() - MONTERREY_OFFSET_MS);

  const day = String(monterreyDate.getUTCDate()).padStart(2, '0');
  const month = String(monterreyDate.getUTCMonth() + 1).padStart(2, '0');
  const year = String(monterreyDate.getUTCFullYear()).slice(-2);

  const hours24 = monterreyDate.getUTCHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = String(monterreyDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(monterreyDate.getUTCSeconds()).padStart(2, '0');
  const period = hours24 < 12 ? 'a.m.' : 'p.m.';

  return `${day}/${month}/${year}, ${hours12}:${minutes}:${seconds} ${period}`;
}

export async function getNotificationsByUser(userId: number) {
  const notifications = await apiRequest<BackendNotification[]>(`/notifications/user/${userId}`);

  return notifications.map((notification) => ({
    id: notification.notification_id,
    title: notification.title,
    message: notification.content,
    time: notification.time ?? formatNotificationTime(notification.createdAt),
    type: mapReasonToType(notification.reason),
  }));
}

export async function deleteNotification(notificationId: number) {
  await apiRequest(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });
}