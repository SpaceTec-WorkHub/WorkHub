import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Map, 
  CalendarCheck, 
  UserCheck, 
  Settings, 
  Trophy, 
  Car, 
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { clearSession, isAdminUser } from '../../../services/auth';

const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
            : "text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
        )
      }
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium text-sm">{label}</span>
    </NavLink>
  );
};

export default function Layout() {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/map", icon: Map, label: "Mapa de Espacios" },
    { to: "/reservation", icon: CalendarCheck, label: "Reservar" },
    { to: "/reservations", icon: CalendarCheck, label: "Mis Reservas" },
    { to: "/check-in-out", icon: UserCheck, label: "Check-in / Out" },
    { to: "/carpool", icon: Car, label: "Carpool" },
    { to: "/gamification", icon: Trophy, label: "Mis Puntos" },
  ];

  const adminNavItem = isAdminUser() ? { to: "/admin", icon: Settings, label: "Administración" } : null;

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-xl lg:shadow-none lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              WH
            </div>
            WorkHub MTY
          </div>
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <div className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Menu Principal
          </div>
          {navItems.concat(adminNavItem ? [adminNavItem] : []).map((item) => (
            <SidebarItem key={item.to} {...item} />
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md"
          >
            <Menu size={20} />
          </button>
          
          <h1 className="text-lg font-semibold text-slate-800 dark:text-white hidden lg:block">
            {navItems.find(item => item.to === location.pathname)?.label || "Bienvenido"}
          </h1>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              JD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
