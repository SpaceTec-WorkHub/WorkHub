import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router';
import { Bell, Moon, Sun, X } from 'lucide-react';
import { getCurrentUserId } from '../../services/auth';
import {
  deleteNotification,
  getNotificationsByUser,
  UiNotification,
} from '../../services/notifications';

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

export default function DashboardLayout() {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      const userId = getCurrentUserId();
      if (!userId) { setNotifications([]); return; }
      try {
        const userNotifications = await getNotificationsByUser(userId);
        setNotifications(userNotifications);
      } catch {
        setNotifications([]);
      }
    };

    const closeNotificationsOnOutsideClick = (event: MouseEvent) => {
      if (
        showNotifications &&
        notificationsPanelRef.current &&
        !notificationsPanelRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    const updateNotifications = () => { void loadNotifications(); };

    void loadNotifications();
    const pollingId = window.setInterval(() => { void loadNotifications(); }, 5000);
    window.addEventListener('notificationsUpdated', updateNotifications);
    document.addEventListener('mousedown', closeNotificationsOnOutsideClick);

    return () => {
      window.clearInterval(pollingId);
      window.removeEventListener('notificationsUpdated', updateNotifications);
      document.removeEventListener('mousedown', closeNotificationsOnOutsideClick);
    };
  }, [showNotifications]);

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((current) => current.filter((n) => n.id !== notificationId));
    } catch {
      // no-op
    }
  };

  const unreadCount = notifications.length;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 ml-64 overflow-y-auto">
        <header className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
          <div className="px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
              WorkHub MTY
            </h1>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400 dark:text-slate-500 hidden sm:block">
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* Dark mode toggle */}
              <button
                type="button"
                onClick={toggleDark}
                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications */}
              <div className="relative" ref={notificationsPanelRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <h2 className="font-semibold text-slate-800 dark:text-white">Notificaciones</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {unreadCount === 0 ? 'No tienes notificaciones' : `Tienes ${unreadCount} notificaciones`}
                      </p>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                          Todavía no hay notificaciones.
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="relative px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 pr-10"
                          >
                            <button
                              type="button"
                              aria-label="Eliminar notificación"
                              onClick={() => { void handleDeleteNotification(notification.id); }}
                              className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{notification.title}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{notification.message}</p>
                            <p className="text-xs text-slate-400 mt-2">{notification.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
