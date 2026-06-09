import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Car,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getCurrentUserId } from '../../services/auth';
import { getUserReservations, ReservationRecord } from '../../services/reservation';

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

  // Count reservations per day (Mon=1 … Sun=0), exclude cancelled
  const countByDay = new Array(7).fill(0);
  for (const r of reservations) {
    if (r.status === 'cancelled') continue;
    const start = new Date(r.start_time);
    if (start >= monday && start <= sunday) {
      countByDay[start.getDay()]++;
    }
  }

  // Return Mon → Fri (indices 1–5)
  return [1, 2, 3, 4, 5].map((dayIdx) => ({
    name: DAY_LABELS[dayIdx],
    reservas: countByDay[dayIdx],
  }));
}

// ── sub-componentes ───────────────────────────────────────────────────────────

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

const RecommendationCard = ({ title, desc, time, type }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
    <div className={`p-2 rounded-full ${type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
      {type === 'warning' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
    </div>
    <div>
      <h4 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
      <span className="text-xs text-slate-400 mt-2 block">{time}</span>
    </div>
  </div>
);

// ── componente principal ──────────────────────────────────────────────────────

type DashboardUser = { full_name: string; email: string };

export default function Dashboard() {
  const [user, setUser] = useState<DashboardUser>({ full_name: '', email: '' });
  const [loadingUser, setLoadingUser] = useState(true);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = esta semana, -1 = semana pasada

  const currentUserId = getCurrentUserId();

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

  // Computa datos de la gráfica según la semana seleccionada
  const chartData = useMemo(() => buildChartData(reservations, weekOffset), [reservations, weekOffset]);

  // Estadísticas rápidas derivadas de reservaciones reales
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

    // Próxima reserva (futura y con status reserved)
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

  const displayName = user.full_name.trim() || 'Usuario';
  const maxReservas = Math.max(...chartData.map((d) => d.reservas), 1);

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {loadingUser ? 'Cargando...' : `Hola ${displayName}`}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {loadingUser ? 'Estamos recuperando tu información.' : 'Aquí tienes el resumen de tu actividad.'}
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
          <div className="flex justify-between items-center mb-6">
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
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                    itemStyle={{ color: '#2563eb' }}
                    formatter={(value: number) => [value, 'Reservas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="reservas"
                    stroke="#2563eb"
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

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recomendaciones</h3>
            <div className="space-y-4">
              <RecommendationCard
                title="Reserva con anticipación"
                desc="Las salas de juntas suelen llenarse rápido entre 9:00 y 11:00 AM."
                time="Consejo general"
                type="info"
              />
              <RecommendationCard
                title="Revisa tu próxima reserva"
                desc="Recuerda hacer check-in desde 15 minutos antes para no perder tu espacio."
                time="Recordatorio"
                type="warning"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
