import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users, Car, Clock, TrendingUp, AlertCircle, CheckCircle2,
  Calendar, Sparkles, Loader2, Star,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getCurrentUserId } from '../../services/auth';
import { getUserReservations, ReservationRecord } from '../../services/reservation';
import {
  getGlobalRecommendations,
  getParkingRecommendations,
  IAGlobalRecommendation,
  IARecommendation,
} from '../../services/ia';

const API_URL = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? '';

// ── helpers de semana ─────────────────────────────────────────────────────────

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getWeekBounds(offsetWeeks: number) {
  const now = new Date();
  const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function buildChartData(reservations: ReservationRecord[], offsetWeeks: number) {
  const { monday, sunday } = getWeekBounds(offsetWeeks);

  const countByDay = new Array(7).fill(0);
  for (const r of reservations) {
    if (r.status === 'cancelled') continue;
    const start = new Date(r.start_time);
    if (start >= monday && start <= sunday) {
      countByDay[start.getDay()]++;
    }
  }

  return [1, 2, 3, 4, 5].map((dayIdx) => ({
    name: DAY_LABELS[dayIdx],
    reservas: countByDay[dayIdx],
  }));
}


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
      {trend !== undefined && (
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
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tipo]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-purple-100 rounded-lg">
          <Icon size={15} className="text-purple-600" />
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
          {data.best_days_to_attend_ranking.slice(0, 3).map(day => (
            <div key={day.day_id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {day.position === 1 && <Star size={12} className="text-amber-500 shrink-0" />}
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {day.position === 1 ? <strong>{day.day_name}</strong> : day.day_name}
                </span>
              </div>
            </div>
          ))}
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
      .catch((err: Error) => setError(err.message))
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
      <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
        <div className="flex items-center gap-2 mb-1">
          <Car size={14} className="text-purple-600 shrink-0" />
          <p className="text-xs font-semibold text-purple-700">Tu cajón recomendado</p>
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


type DashboardUser = { full_name: string; email: string };

export default function Dashboard() {
  const [user, setUser] = useState<DashboardUser>({ full_name: '', email: '' });
  const [loadingUser, setLoadingUser] = useState(true);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const currentUserId = getCurrentUserId();
  const userId = currentUserId ?? 1;

  // Carga usuario
  useEffect(() => {
    if (!currentUserId) { setLoadingUser(false); return; }
    let mounted = true;
    setLoadingUser(true);
    fetch(`${API_URL}/users/${currentUserId}`)
      .then((r) => r.ok ? r.json() as Promise<Partial<DashboardUser>> : Promise.reject())
      .then((data) => { if (mounted) setUser({ full_name: data.full_name ?? '', email: data.email ?? '' }); })
      .catch(() => { if (mounted) setUser({ full_name: '', email: '' }); })
      .finally(() => { if (mounted) setLoadingUser(false); });
    return () => { mounted = false; };
  }, [currentUserId]);

  // Carga reservaciones del usuario para la gráfica
  useEffect(() => {
    if (!currentUserId) { setLoadingChart(false); return; }
    let mounted = true;
    setLoadingChart(true);
    getUserReservations(currentUserId)
      .then((data) => { if (mounted) setReservations(data ?? []); })
      .catch(() => { if (mounted) setReservations([]); })
      .finally(() => { if (mounted) setLoadingChart(false); });
    return () => { mounted = false; };
  }, [currentUserId]);

  const chartData = useMemo(() => buildChartData(reservations, weekOffset), [reservations, weekOffset]);

  const stats = useMemo(() => {
    const active = reservations.filter((r) =>
      ['reserved', 'checked_in', 'checkout_pending'].includes(r.status),
    );
    const thisWeek = reservations.filter((r) => {
      const { monday, sunday } = getWeekBounds(0);
      const start = new Date(r.start_time);
      return start >= monday && start <= sunday && r.status !== 'cancelled';
    });
    const checkedOut = reservations.filter((r) => r.status === 'checked_out');

    const now = new Date();
    const upcoming = active
      .filter((r) => r.status === 'reserved' && new Date(r.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

    const upcomingTime = upcoming
      ? new Date(upcoming.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      : '—';
    const upcomingSpace = upcoming?.space?.code ?? (upcoming ? 'Espacio' : 'Sin reservas');

    return {
      activeCount: active.length,
      weekCount: thisWeek.length,
      completedCount: checkedOut.length,
      upcomingTime,
      upcomingSpace,
    };
  }, [reservations]);

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1);

  const displayName = user.full_name.trim() || 'Usuario';
  const maxReservas = Math.max(...chartData.map((d) => d.reservas), 1);

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {loadingUser ? 'Cargando...' : `Buenos días, ${displayName}`}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {loadingUser ? 'Estamos recuperando tu información.' : `Aquí tienes el resumen de hoy, ${todayFormatted}.`}
          </p>
        </div>
      </div>

      {/* Stats reales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Reservas activas"
          value={loadingChart ? '…' : stats.activeCount}
          subtext="Reservadas, en curso o pendientes"
          icon={Users}
          colorClass="bg-purple-500 text-purple-600"
        />
        <StatCard
          title="Reservas esta semana"
          value={loadingChart ? '…' : stats.weekCount}
          subtext="Lunes a domingo (activas o completadas)"
          icon={TrendingUp}
          colorClass="bg-emerald-500 text-emerald-600"
        />
        <StatCard
          title="Reservas completadas"
          value={loadingChart ? '…' : stats.completedCount}
          subtext="Total historial con check-out"
          icon={CheckCircle2}
          colorClass="bg-purple-500 text-purple-600"
        />
        <StatCard
          title="Próxima reserva"
          value={loadingChart ? '…' : stats.upcomingTime}
          subtext={loadingChart ? '' : stats.upcomingSpace}
          icon={Clock}
          colorClass="bg-amber-500 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfica */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Reservaciones por día</h3>
              <p className="text-xs text-slate-400 mt-0.5">Lunes a viernes · excluyendo canceladas</p>
            </div>
            <select
              value={weekOffset}
              onChange={(e) => setWeekOffset(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm rounded-lg px-3 py-1.5 outline-none text-slate-700 dark:text-slate-200"
            >
              <option value={0}>Esta semana</option>
              <option value={-1}>Semana pasada</option>
              <option value={-2}>Hace 2 semanas</option>
            </select>
          </div>

          {loadingChart ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              Cargando datos...
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReservas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b' }}
                    allowDecimals={false}
                    domain={[0, Math.max(maxReservas + 1, 4)]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#9333ea' }}
                    formatter={(value: number) => [value, 'Reservas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="reservas"
                    stroke="#9333ea"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorReservas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loadingChart && chartData.every((d) => d.reservas === 0) ? (
            <p className="mt-3 text-center text-xs text-slate-400">
              Sin reservaciones registradas para esta semana.
            </p>
          ) : null}
        </div>

        {/* Sidebar con IA */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-purple-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Para ti</h3>
            </div>
            <PersonalizedSection userId={userId} />
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={18} className="text-purple-500" />
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
        </div>
      </div>
    </div>
  );
}
