import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Map as MapIcon,
  CalendarCheck,
  CheckCircle,
  Settings,
  Trophy,
  Car,
  LogOut,
  Menu,
  Bell,
  User,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils'; // I might need to create this utility or just inline it
import { motion, AnimatePresence } from 'motion/react';

// Simple utility for class merging if not exists
function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { name: 'Map View', path: '/app/map', icon: MapIcon },
    { name: 'Book Space', path: '/app/booking', icon: CalendarCheck },
    { name: 'Check-In/Out', path: '/app/check-in', icon: CheckCircle },
    { name: 'Carpool', path: '/app/carpool', icon: Car },
    { name: 'Gamification', path: '/app/gamification', icon: Trophy },
    { name: 'Admin Panel', path: '/app/admin', icon: Settings },
  ];

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={classNames(
          "fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-xl flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">W</span>
            </div>
            WorkHub MTY
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/app'}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                classNames(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-400 rounded-lg hover:bg-red-900/20 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 lg:px-8 shadow-sm z-10">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md"
          >
            <Menu size={24} />
          </button>

          <div className="flex-1 flex justify-end items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900">Alex Morgan</div>
                <div className="text-xs text-slate-500">Product Designer</div>
              </div>
              <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 border-2 border-white shadow-sm overflow-hidden">
                {/* Placeholder avatar */}
                 <User size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
