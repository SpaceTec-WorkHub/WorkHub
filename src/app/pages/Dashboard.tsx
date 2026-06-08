import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users, Car, Clock, TrendingUp, MapPin, Calendar,
  Sparkles, Loader2, AlertCircle, Star
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getGlobalRecommendations, getParkingRecommendations, IAGlobalRecommendation, IARecommendation } from '../../services/ia';
import { getStoredSession } from '../../services/auth';

const chartData = [
  { name: 'Lun', ocupacion: 65 },
  { name: 'Mar', ocupacion: 80 },
  { name: 'Mie', ocupacion: 95 },
  { name: 'Jue', ocupacion: 85 },
  { name: 'Vie', ocupacion: 45 },
];

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, trend }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
    <p className="text-xs text-slate-400 mt-2">{subtext}</p>
  </motion.div>
);

function trafficInfo(index: number): { color: string; label: string } {
  if (index <= 0.35) return { color: 'bg-emerald-100 text-emerald-700', label: 'Poco tráfico' };
  if (index <= 0.65) return { color: 'bg-amber-100 text-amber-700',     label: 'Tráfico moderado' };
  return                     { color: 'bg-red-100 text-red-700',         label: 'Mucho tráfico' };
}

function GlobalRecommendationSection({ tipo, label, icon: Icon }: {
  tipo: 1 | 2 | 3;
  label: string;
  icon: React.ElementType;
}) {
  const [data, setData]       = useState<IAGlobalRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getGlobalRecommendations(tipo)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [tipo]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-blue-100 rounded-lg">
          <Icon size={15} className="text-blue-600" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
          <Loader2 size={14} className="animate-spin" /> Consultando modelo...
        </div>
      )}
      {!loading && error && (
        <div className="flex items-start gap-2 text-red-500 text-xs p-2 bg-red-50 rounded-lg">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> No disponible ahora
        </div>
      )}
      {!loading && !error && data && (
        <div className="space-y-2">
          {data.best_days_to_attend_ranking.slice(0, 3).map(day => {
            const { color, label: trafficLabel } = trafficInfo(day.estimated_traffic_index);
            return (
              <div key={day.day_id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {day.position === 1 && <Star size={12} className="text-amber-500 shrink-0" />}
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {day.position === 1 ? <strong>{day.day_name}</strong> : day.day_name}
                  </span>
                </div>
                
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonalizedSection({ userId }: { userId: number }) {
  const [data, setData]       = useState<IARecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getParkingRecommendations(userId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
      <Loader2 size={14} className="animate-spin" /> Cargando tu recomendación...
    </div>
  );

  if (error) return (
    <div className="flex items-start gap-2 text-red-500 text-xs p-2 bg-red-50 rounded-lg">
      <AlertCircle size={13} className="mt-0.5 shrink-0" /> No disponible ahora
    </div>
  );

  if (!data) return null;

  const { parking_recommendation: park, workspace_recommendation: work } = data;

  return (
    <div className="space-y-3">
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-2 mb-1">
          <Car size={14} className="text-blue-600 shrink-0" />
          <p className="text-xs font-semibold text-blue-700">Tu cajón recomendado</p>
        </div>
        <p className="text-sm font-bold text-slate-800">{park.space_code} — Zona {park.zone_name}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Mejor día: <strong>{park.best_day_to_attend}</strong> 
        </p>
      </div>

      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
        <div className="flex items-center gap-2 mb-1">
          <Users size={14} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">Tu escritorio recomendado</p>
        </div>
        <p className="text-sm font-bold text-slate-800">{work.space_code} — Zona {work.zone_name}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Mejor día: <strong>{work.best_day_to_attend}</strong> 
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const session = getStoredSession();
  const user = session?.user as { full_name?: string; first_name?: string; user_id?: number; id?: number } | undefined;
  const displayName = user?.full_name ?? user?.first_name ?? 'Usuario';
  const userId = user?.user_id ?? user?.id ?? 1;

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buenos días, {displayName}</h1>
          <p className="text-slate-500 dark:text-slate-400">Aquí tienes el resumen de hoy, {todayFormatted}.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Ver Reportes
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 dark:shadow-none">
            Reservar Espacio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Escritorios Disponibles" value="42" subtext="De 150 totales en piso 4" icon={Users} colorClass="bg-blue-500 text-blue-600" trend={12} />
        <StatCard title="Estacionamiento" value="15" subtext="Lugares libres en Sótano 2" icon={Car} colorClass="bg-indigo-500 text-indigo-600" trend={-5} />
        <StatCard title="Promedio Ocupación" value="78%" subtext="Esta semana" icon={TrendingUp} colorClass="bg-emerald-500 text-emerald-600" trend={8} />
        <StatCard title="Próxima Reserva" value="14:00" subtext="Sala de Juntas B" icon={Clock} colorClass="bg-amber-500 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Ocupación Semanal</h3>
            <select className="bg-slate-50 dark:bg-slate-700 border-none text-sm rounded-md px-3 py-1">
              <option>Esta semana</option>
              <option>Semana pasada</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorOcupacion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#2563eb' }} />
                <Area type="monotone" dataKey="ocupacion" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorOcupacion)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-blue-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Para ti</h3>
            </div>
            <PersonalizedSection userId={userId} />
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={18} className="text-blue-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tendencias globales</h3>
            </div>
            <div className="space-y-5">
              <GlobalRecommendationSection tipo={1} label="Mejores días para estacionar" icon={Car} />
              <div className="border-t border-slate-100 dark:border-slate-700" />
              <GlobalRecommendationSection tipo={2} label="Mejores días para escritorio" icon={Users} />
              <div className="border-t border-slate-100 dark:border-slate-700" />
              <GlobalRecommendationSection tipo={3} label="Mejores días para sala" icon={Calendar} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Check-in Pendiente</h3>
              <p className="text-slate-300 text-sm mb-4">Tienes una reserva activa para hoy a las 09:00 AM.</p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full transition-colors">
                Hacer Check-in
              </button>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
              <MapPin size={100} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}