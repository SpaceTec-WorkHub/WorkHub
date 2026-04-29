import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  Lock,
  Medal,
  PencilLine,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Users,
  Unlock,
  Trash2,
  Save,
} from 'lucide-react';
import { isAdminUser, getCurrentUserId } from '../../services/auth';
import {
  createGamificationReward,
  createEmergencyZoneBlock,
  createSpecialEventReservations,
  deleteGamificationReward,
  getGamificationRewards,
  getZones,
  ZoneOption,
  updateGamificationReward,
  GamificationRewardPayload,
  GamificationRewardsResponse,
} from '../../services/admin';

const toDateTimeLocalValue = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function Admin() {
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [zoneError, setZoneError] = useState('');
  const [isAdmin, setIsAdmin] = useState(isAdminUser());

  const [emergencyZoneId, setEmergencyZoneId] = useState<number | null>(null);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyStartTime, setEmergencyStartTime] = useState('');
  const [emergencyIndefinite, setEmergencyIndefinite] = useState(true);
  const [emergencyEndTime, setEmergencyEndTime] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');

  const [eventTitle, setEventTitle] = useState('Town hall / evento especial');
  const [eventZoneId, setEventZoneId] = useState<number | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [eventMessage, setEventMessage] = useState('');

  const [rewards, setRewards] = useState<GamificationRewardsResponse['rewards']>([]);
  const [rewardsPeriod, setRewardsPeriod] = useState('');
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState('');
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardPoints, setRewardPoints] = useState(50);

  useEffect(() => {
    setIsAdmin(isAdminUser());
  }, []);

  useEffect(() => {
    setLoadingZones(true);
    getZones()
      .then((data) => {
        setZones(data);
        setEmergencyZoneId(data[0]?.zone_id ?? null);
        setEventZoneId(data[0]?.zone_id ?? null);
        setZoneError('');
      })
      .catch((error) => {
        setZoneError(error instanceof Error ? error.message : 'No fue posible cargar las zonas.');
      })
      .finally(() => setLoadingZones(false));
  }, []);

  useEffect(() => {
    setRewardsLoading(true);

    getGamificationRewards()
      .then((rewardState) => {
        setRewards(rewardState.rewards);
        setRewardsPeriod(rewardState.period.label);
        setRewardsError('');
      })
      .catch((error) => {
        setRewardsError(error instanceof Error ? error.message : 'No fue posible cargar los premios quincenales.');
      })
      .finally(() => setRewardsLoading(false));
  }, []);

  const adminSince = useMemo(() => {
    const userId = getCurrentUserId();
    return userId ? `Usuario activo: #${userId}` : 'Sesión administrativa activa';
  }, []);

  const resetRewardForm = () => {
  setEditingRewardId(null);
  setRewardTitle('');
  setRewardDescription('');
  setRewardPoints(50);
  setRewardMessage('');
};

  const refreshRewards = async () => {
    const rewardState = await getGamificationRewards();
    setRewards(rewardState.rewards);
    setRewardsPeriod(rewardState.period.label);
  };

  const handleEmergencySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emergencyZoneId || !emergencyReason.trim() || !emergencyStartTime) {
      setEmergencyMessage('Completa zona, justificación y fecha de inicio.');
      return;
    }

    setEmergencyLoading(true);
    setEmergencyMessage('');

    try {
      const response = await createEmergencyZoneBlock({
        zone_id: emergencyZoneId,
        reason: emergencyReason.trim(),
        start_time: new Date(emergencyStartTime).toISOString(),
        ...(emergencyIndefinite || !emergencyEndTime
          ? {}
          : { end_time: new Date(emergencyEndTime).toISOString() }),
      });

      setEmergencyMessage(
        `Bloqueo creado. Se cancelaron ${response.cancelledReservations} reservas y la zona quedó bloqueada.`,
      );
      setEmergencyReason('');
      setEmergencyStartTime('');
      setEmergencyEndTime('');
      setEmergencyIndefinite(true);
    } catch (error) {
      setEmergencyMessage(error instanceof Error ? error.message : 'No fue posible crear el bloqueo.');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleEventSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventZoneId || !eventDate || !eventStartTime || !eventEndTime) {
      setEventMessage('Completa zona, fecha y horario del evento.');
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      setEventMessage('No se encontró la sesión administrativa.');
      return;
    }

    setEventLoading(true);
    setEventMessage('');

    try {
      const response = await createSpecialEventReservations({
        title: eventTitle,
        zone_id: eventZoneId,
        user_id: userId,
        start_time: `${eventDate}T${eventStartTime}:00`,
        end_time: `${eventDate}T${eventEndTime}:00`,
      });

      setEventMessage(
        `Evento creado. ${response.createdReservations} reservas generadas y ${response.cancelledReservations} reservas previas canceladas.`,
      );
      setEventTitle('Town hall / evento especial');
      setEventDate('');
      setEventStartTime('');
      setEventEndTime('');
    } catch (error) {
      setEventMessage(error instanceof Error ? error.message : 'No fue posible crear el evento especial.');
    } finally {
      setEventLoading(false);
    }
  };

  const handleRewardEdit = (reward: GamificationRewardsResponse['rewards'][number]) => {
  setEditingRewardId(reward.gamification_reward_id);
  setRewardTitle(reward.title);
  setRewardDescription(reward.description);
  setRewardPoints(reward.points);
  setRewardMessage('Editando premio seleccionado.');
};

  const handleRewardDelete = async (rewardId: number) => {
    setRewardSaving(true);
    setRewardMessage('');

    try {
      await deleteGamificationReward(rewardId);
      if (editingRewardId === rewardId) {
        resetRewardForm();
      }
      await refreshRewards();
      setRewardMessage('Premio eliminado correctamente.');
    } catch (error) {
      setRewardMessage(error instanceof Error ? error.message : 'No fue posible eliminar el premio.');
    } finally {
      setRewardSaving(false);
    }
  };

  const handleRewardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (!rewardTitle.trim() || !rewardDescription.trim()) {
    setRewardMessage('Completa título y descripción.');
    return;
  }

  setRewardSaving(true);
  setRewardMessage('');

  const payload: GamificationRewardPayload = {
    title: rewardTitle.trim(),
    description: rewardDescription.trim(),
    points: Number(rewardPoints),
  };

  try {
    if (editingRewardId) {
      await updateGamificationReward(editingRewardId, payload);
      setRewardMessage('Premio actualizado correctamente.');
    } else {
      await createGamificationReward(payload);
      setRewardMessage('Premio creado correctamente.');
    }

    await refreshRewards();
    resetRewardForm();
  } catch (error) {
    setRewardMessage(error instanceof Error ? error.message : 'No fue posible guardar el premio.');
  } finally {
    setRewardSaving(false);
  }
};

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="flex items-center gap-3">
          <ShieldAlert size={22} />
          <div>
            <h1 className="text-lg font-semibold">Acceso restringido</h1>
            <p className="text-sm">Este panel solo está disponible para usuarios administradores.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel Administrativo</h1>
          <p className="text-slate-500">Bloqueos de emergencia, eventos especiales y operación de zonas.</p>
          <p className="mt-2 text-xs text-slate-400">{adminSince}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {format(new Date(), 'PPP p')}
        </div>
      </div>

      {zoneError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {zoneError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-red-600">
            <Lock size={20} />
            <h2 className="font-semibold">Bloqueo de emergencia</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Bloquea una zona completa por remodelación, mantenimiento o cualquier caso indefinido.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleEmergencySubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Zona</label>
              <select
                value={emergencyZoneId ?? ''}
                onChange={(event) => setEmergencyZoneId(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                disabled={loadingZones}
              >
                {zones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Justificación</label>
              <textarea
                value={emergencyReason}
                onChange={(event) => setEmergencyReason(event.target.value)}
                rows={4}
                placeholder="Ej. Remodelación del piso 4 hasta nuevo aviso"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Inicio del bloqueo</label>
              <input
                type="datetime-local"
                value={emergencyStartTime}
                onChange={(event) => setEmergencyStartTime(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={emergencyIndefinite}
                onChange={(event) => setEmergencyIndefinite(event.target.checked)}
              />
              Bloqueo indefinido
            </label>
            {!emergencyIndefinite ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fin del bloqueo</label>
                <input
                  type="datetime-local"
                  value={emergencyEndTime}
                  onChange={(event) => setEmergencyEndTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            ) : null}
            <button
              type="submit"
              disabled={emergencyLoading || loadingZones}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <AlertTriangle size={16} />
              {emergencyLoading ? 'Creando bloqueo...' : 'Crear bloqueo de emergencia'}
            </button>
          </form>
          {emergencyMessage ? <p className="mt-4 text-sm text-slate-600">{emergencyMessage}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-blue-600">
            <Sparkles size={20} />
            <h2 className="font-semibold">Evento especial</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Reserva en masa todos los espacios disponibles de una zona para una ventana horaria definida.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleEventSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título</label>
              <input
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Zona</label>
              <select
                value={eventZoneId ?? ''}
                onChange={(event) => setEventZoneId(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                disabled={loadingZones}
              >
                {zones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</label>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Inicio</label>
                <input
                  type="time"
                  value={eventStartTime}
                  onChange={(event) => setEventStartTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fin</label>
                <input
                  type="time"
                  value={eventEndTime}
                  onChange={(event) => setEventEndTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={eventLoading || loadingZones}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Calendar size={16} />
              {eventLoading ? 'Creando evento...' : 'Crear evento especial'}
            </button>
          </form>
          {eventMessage ? <p className="mt-4 text-sm text-slate-600">{eventMessage}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <Unlock size={20} />
            <h2 className="font-semibold">Gestión de usuarios</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            E
          </p>
          <button className="mt-5 w-full rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
            Ver usuarios
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 text-purple-600">
              <Medal size={20} />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Premios quincenales</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {rewardsPeriod ? `Premios registrados para ${rewardsPeriod}.` : 'Premios registrados por quincena.'}
            </p>
          </div>
          <button
            type="button"
            onClick={resetRewardForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw size={16} />
            Nuevo premio
          </button>
        </div>

        {rewardsError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {rewardsError}
          </div>
        ) : null}

        {rewardMessage ? (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {rewardMessage}
          </div>
        ) : null}

        {rewardsLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Cargando premios quincenales...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                Premios actuales ({rewards.length})
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {rewards.length > 0 ? (
                  rewards.map((reward) => (
                    <div key={reward.gamification_reward_id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{reward.title}</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            +{reward.points}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{reward.description}</p>
                        <p className="text-xs text-slate-400">
                          Premio
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRewardEdit(reward)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <PencilLine size={16} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRewardDelete(reward.gamification_reward_id)}
                          disabled={rewardSaving}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          Borrar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-slate-500">
                    Aún no hay premios para esta quincena.
                  </div>
                )}
              </div>
            </div>

            <form className="space-y-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-700" onSubmit={handleRewardSubmit}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingRewardId ? 'Editar premio' : 'Nuevo premio'}
                </h3>
                <span className="text-xs text-slate-400">Premio</span>
              </div>

             

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título</label>
                <input
                  value={rewardTitle}
                  onChange={(event) => setRewardTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Premio quincenal"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                <textarea
                  value={rewardDescription}
                  onChange={(event) => setRewardDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Describe por qué se entrega el premio"
                />
              </div>

              {editingRewardId ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Puntos</label>
                    <input
                      type="number"
                      value={rewardPoints}
                      onChange={(event) => setRewardPoints(Number(event.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                 
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                  Se guardará como premio informativo de la sesión actual. El admin podrá editar usuario, fecha y puntos después.
                </div>
              )}


              <button
                type="submit"
                disabled={rewardSaving || rewardsLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Save size={16} />
                {rewardSaving ? 'Guardando...' : editingRewardId ? 'Actualizar premio' : 'Crear premio'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
