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
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { clearSession, getStoredSession, isAdminUser } from '../../services/auth';
import logo from '../assets/logo.png';

type SidebarUser = {
  full_name?: string | null;
  email?: string | null;
  role?: { name?: string | null } | null;
  user_type?: string | null;
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
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

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const session = getStoredSession();
  const user = session?.user as SidebarUser | undefined;
  const displayName = user?.full_name?.trim() || user?.email?.trim() || 'Usuario';
  const roleName = (user?.role?.name ?? user?.user_type ?? '').toLowerCase();
  const displayRole = roleName === 'admin' ? 'admin' : 'user';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        id="main-sidebar"
        className={clsx(
          'fixed left-0 top-0 z-40 flex h-screen w-64 max-w-[85vw] transform flex-col bg-purple-900 shadow-xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        )}
      >
        {/* Logo — click goes to dashboard */}
        <div className="flex items-center border-b border-purple-800">
          <Link
            to="/"
            onClick={onClose}
            className="flex flex-1 items-center gap-3 p-5 hover:bg-white/5 transition-colors min-w-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/20 shrink-0 p-1 overflow-hidden">
              <img src={logo} alt="Accenture" className="h-full w-full object-contain rounded-lg" />
            </div>
            <div className="min-w-0">
              <span className="text-white font-bold text-base tracking-tight leading-none">WorkHub</span>
              <span className="block text-purple-300 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Accenture</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="mr-3 shrink-0 rounded-lg p-2 text-purple-200 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
          {navItems.filter(item => item.path !== '/admin' || isAdminUser()).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
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
            onClick={() => {
              navigate('/profile');
              onClose();
            }}
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-purple-200 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
