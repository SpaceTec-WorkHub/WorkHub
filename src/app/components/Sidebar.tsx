import React from 'react';
import { NavLink } from 'react-router';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  CalendarCheck, 
  CheckCircle, 
  Settings, 
  Trophy, 
  Car, 
  LogOut 
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: MapIcon, label: 'Mapa de Espacios', path: '/map' },
  { icon: CalendarCheck, label: 'Reservar', path: '/reservation' },
  { icon: CheckCircle, label: 'Check-in', path: '/check-in' },
  { icon: Car, label: 'Carpool', path: '/carpool' },
  { icon: Trophy, label: 'Gamificación', path: '/gamification' },
  { icon: Settings, label: 'Admin', path: '/admin' },
];

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm fixed left-0 top-0 z-10">
      <div className="p-6 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">W</span>
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">WorkHub MTY</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={20}
                  className={clsx(
                    "transition-colors",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-4 px-2">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt="User"
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">Carlos Ruiz</p>
            <p className="text-xs text-slate-500">UX Designer</p>
          </div>
        </div>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
