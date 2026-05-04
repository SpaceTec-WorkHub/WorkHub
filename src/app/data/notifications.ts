export type AppNotification = {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'reservation' | 'reminder' | 'car' | 'system';
};

export const notifications: AppNotification[] = [];

export function addNotification(
  title: string,
  message: string,
  type: AppNotification['type'] = 'system'
) {
  notifications.unshift({
    id: Date.now(),
    title,
    message,
    time: 'Ahora',
    read: false,
    type,
  });
}

export function notifyChange() {
  window.dispatchEvent(new Event('notificationsUpdated'));
}