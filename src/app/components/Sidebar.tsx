import { Link, NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Map as MapIcon,
  CalendarCheck,
  History,
  CheckCircle,
  Settings,
  Trophy,
  Car,
  LogOut,
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { clearSession, getStoredSession } from '../../services/auth';
import logo from '../assets/logo.png';

type SidebarUser = {
  full_name?: string | null;
  email?: string | null;
  role?: { name?: string | null } | null;
  user_type?: string | null;
};

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: MapIcon, label: 'Mapa de Espacios', path: '/map' },
  { icon: CalendarCheck, label: 'Reservar', path: '/reservation' },
  { icon: History, label: 'Historial', path: '/reservations' },
  { icon: CheckCircle, label: 'Check-in', path: '/check-in' },
  { icon: Car, label: 'Carpool', path: '/carpool' },
  { icon: Trophy, label: 'Gamificación', path: '/gamification' },
  { icon: User, label: 'Perfil', path: '/profile' },
  { icon: Settings, label: 'Admin', path: '/admin' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const user = session?.user as SidebarUser | undefined;
  const displayName = user?.full_name?.trim() || user?.email?.trim() || 'Usuario';
  const roleName = (user?.role?.name ?? user?.user_type ?? '').toLowerCase();
  const displayRole = roleName === 'admin' ? 'admin' : 'user';

  return (
    <div className="w-64 h-screen bg-purple-900 flex flex-col shadow-xl fixed left-0 top-0 z-10">
      {/* Logo — click goes to dashboard */}
      <Link
        to="/"
        className="p-5 border-b border-purple-800 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200/20 shrink-0 p-1">
          <img src={logo} alt="Accenture" className="h-full w-full object-contain" />
        </div>
        <div>
          <span className="text-white font-bold text-base tracking-tight leading-none">WorkHub</span>
          <span className="block text-purple-300 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Accenture</span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-purple-200 hover:bg-white/5 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={clsx(
                    'transition-colors shrink-0',
                    isActive ? 'text-white' : 'text-purple-400 group-hover:text-purple-200',
                  )}
                />
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-0.5 h-6 bg-white rounded-r-full"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-purple-800">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 mb-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors w-full text-left"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-700 text-purple-200 shrink-0">
            <User size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs text-purple-400">{displayRole}</p>
          </div>
        </button>

        <button
          onClick={() => {
            clearSession();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-rose-300 bg-rose-900/20 hover:bg-rose-900/40 rounded-lg transition-colors"
        >
          <LogOut size={15} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
