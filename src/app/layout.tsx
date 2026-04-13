import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Map, 
  CalendarCheck, 
  UserCheck, 
  Settings, 
  Trophy, 
  Car, 
  LogOut, 
  Menu,
  X,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Button } from './components/ui/button';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Mapa de Espacios', href: '/map', icon: Map },
    { name: 'Mis Reservas', href: '/booking', icon: CalendarCheck },
    { name: 'Check-in / Out', href: '/check-in', icon: UserCheck },
    { name: 'Carpool', href: '/carpool', icon: Car },
    { name: 'Gamificación', href: '/gamification', icon: Trophy },
    { name: 'Admin Panel', href: '/admin', icon: Settings },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              WH
            </div>
            <span>WorkHub MTY</span>
          </div>
          <button 
            className="ml-auto lg:hidden text-gray-500"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon size={18} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={toggleSidebar}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center ml-auto gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">Ana García</p>
                <p className="text-xs text-gray-500">UX Designer</p>
              </div>
              <Avatar>
                <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Ana García" />
                <AvatarFallback>AG</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
