import React from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-slate-800">
              WorkHub MTY
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">Última actualización: Hoy, 10:45 AM</span>
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
