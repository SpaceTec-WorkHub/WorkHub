import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router';
import { Bell } from 'lucide-react';
import { notifications } from '../data/notifications';

export default function DashboardLayout() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [, forceUpdate] = useState(0);

  React.useEffect(() => {
    const updateNotifications = () => forceUpdate((value) => value + 1);

    window.addEventListener('notificationsUpdated', updateNotifications);

    return () => {
      window.removeEventListener('notificationsUpdated', updateNotifications);
    };
  }, []);

  const allNotifications = notifications;
  const unreadCount = allNotifications.filter((item) => !item.read).length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 ml-64 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-slate-800">
              WorkHub MTY
            </h1>

            <div className="flex items-center gap-4 relative">
              <span className="text-sm text-slate-500">
                Última actualización: Hoy, 10:45 AM
              </span>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-5 h-5 text-slate-600" />

                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h2 className="font-semibold text-slate-800">
                        Notificaciones
                      </h2>

                      <p className="text-xs text-slate-500">
                        {unreadCount === 0
                          ? 'No tienes notificaciones nuevas'
                          : `Tienes ${unreadCount} sin leer`}
                      </p>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {allNotifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500 text-center">
                          Todavía no hay notificaciones.
                        </div>
                      ) : (
                        allNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                              !notification.read
                                ? 'bg-blue-50/60'
                                : 'bg-white'
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-800">
                              {notification.title}
                            </p>

                            <p className="text-sm text-slate-600 mt-1">
                              {notification.message}
                            </p>

                            <p className="text-xs text-slate-400 mt-2">
                              {notification.time}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-all font-medium text-sm">
                Reservar Ahora
              </button>
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