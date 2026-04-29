import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, LoaderCircle, Gift, Sparkles, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { getCurrentUserId } from '../../services/auth';
import {
  GamificationLeaderboardResponse,
  getGamificationLeaderboard,
} from '../../services/gamification';

export default function Gamification() {
  const [summary, setSummary] = useState<GamificationLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const currentUserId = useMemo(() => getCurrentUserId(), []);

  useEffect(() => {
    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getGamificationLeaderboard(currentUserId)
      .then((data) => {
        setSummary(data);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'No fue posible cargar la gamificación.');
      })
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const currentUser = summary?.currentUser ?? null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex items-center gap-3 text-slate-500">
          <LoaderCircle className="animate-spin" size={20} />
          Cargando ranking quincenal...
        </div>
      </div>
    );
  }

  if (errorMessage || !summary) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        <h1 className="text-lg font-semibold">Gamificación no disponible</h1>
        <p className="mt-2 text-sm">{errorMessage || 'No hay datos para mostrar.'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ranking quincenal</h1>
        <p className="text-slate-500">Puntos de la quincena actual. Tu fila queda resaltada.</p>
        <p className="text-xs text-slate-400">Periodo: {summary.period.label}</p>
      </div>

      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 p-8 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.35),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
              <Trophy size={48} className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-4xl font-bold">{currentUser?.points?.toLocaleString() ?? '0'}</h2>
              <p className="font-medium text-blue-100">Tus puntos esta quincena</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs">
                <TrendingUp size={12} /> Posición #{currentUser?.rank ?? '-'} de {summary.leaderboard.length}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-blue-100">Reservas</p>
              <p className="mt-2 text-2xl font-bold">{currentUser?.reservations ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-blue-100">Check-ins</p>
              <p className="mt-2 text-2xl font-bold">{currentUser?.checkIns ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-blue-100">Premios</p>
              <p className="mt-2 text-2xl font-bold">{summary.rewards.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tabla de ranking</h3>
            <p className="text-sm text-slate-500">Todos los usuarios ordenados por puntos de la quincena.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} />
            {summary.leaderboard.length} usuarios
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Puntos</th>
                <th className="px-6 py-3">Reservas</th>
                <th className="px-6 py-3">Check-ins</th>
                <th className="px-6 py-3">Premios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {summary.leaderboard.map((row) => {
                const isCurrentUser = row.user_id === currentUser?.user_id;

                return (
                  <tr
                    key={row.user_id}
                    className={clsx(
                      'transition-colors',
                      isCurrentUser
                        ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:ring-blue-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/40',
                    )}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{row.rank}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold', isCurrentUser ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200')}>
                          {(row.full_name ?? row.email ?? 'U').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{row.full_name ?? row.email ?? `Usuario #${row.user_id}`}</p>
                          <p className="text-xs text-slate-500">{row.role ?? 'Sin rol'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{row.points}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.reservations}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.checkIns}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.rewardCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Gift className="text-purple-500" /> Premios quincenales
            </h3>
            <span className="text-sm text-slate-500">Actividad reciente</span>
          </div>

          <div className="space-y-3">
            {summary.currentRewards.length > 0 ? (
              summary.currentRewards.map((reward) => (
                <div key={reward.gamification_reward_id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{reward.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{reward.description}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {reward.period_start && reward.period_end
                          ? `${format(new Date(reward.period_start), 'dd/MM/yyyy')} - ${format(new Date(reward.period_end), 'dd/MM/yyyy')}`
                          : 'Disponible actualmente'}
                      </p>
                    </div>
                    <div className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      +{reward.points}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Todavía no hay premios registrados para esta quincena.
              </div>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
}