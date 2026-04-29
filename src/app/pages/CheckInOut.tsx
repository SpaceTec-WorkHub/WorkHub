import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  QrCode,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentUserId } from '../../services/auth';
import {
  checkInReservation,
  checkOutReservation,
  extendReservation,
  getActiveReservations,
  reportReservationIncident,
  ReservationRecord,
} from '../../services/reservation';

type IncidentType = 'occupied' | 'reassignment' | 'other';

const statusLabels: Record<ReservationRecord['status'], string> = {
  reserved: 'Reservada',
  checked_in: 'En curso',
  checked_out: 'Liberada',
  no_show: 'No-show',
  cancelled: 'Cancelada',
  checkout_pending: 'Checkout pendiente',
  incident: 'Incidencia',
};

const toInputDateTimeValue = (dateTime?: string | null) => {
  if (!dateTime) {
    return '';
  }

  const date = new Date(dateTime);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Pendiente';
  }

  return format(new Date(value), 'dd/MM/yyyy HH:mm');
};

function requestCurrentLocation() {
  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La ubicación no está disponible en este navegador.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => reject(new Error('La ubicación es necesaria para validar tu presencia.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

export default function CheckInOut() {
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [extensionTime, setExtensionTime] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType>('occupied');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentNotes, setIncidentNotes] = useState('');

  const currentUserId = useMemo(() => getCurrentUserId(), []);

  const activeReservation = useMemo(() => {
    return [...reservations].sort((left, right) => {
      const leftPriority = left.status === 'checked_in' ? 0 : left.status === 'checkout_pending' ? 1 : 2;
      const rightPriority = right.status === 'checked_in' ? 0 : right.status === 'checkout_pending' ? 1 : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(left.start_time).getTime() - new Date(right.start_time).getTime();
    })[0] ?? null;
  }, [reservations]);

  useEffect(() => {
    if (!currentUserId) {
      setError('No se encontró la sesión del usuario.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getActiveReservations()
      .then((data) => {
        setReservations(data);
        setError('');
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar tus reservas activas.');
      })
      .finally(() => setLoading(false));
  }, [currentUserId]);

  useEffect(() => {
    setExtensionTime(toInputDateTimeValue(activeReservation?.end_time ?? null));
  }, [activeReservation]);

  const refreshReservations = async () => {
    const data = await getActiveReservations();
    setReservations(data);
  };

  const handleCheckIn = async () => {
    if (!activeReservation) {
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const location = await requestCurrentLocation();
      await checkInReservation(activeReservation.reservation_id, location);
      await refreshReservations();
      setMessage('Check-in registrado correctamente.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible registrar el check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeReservation) {
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      await checkOutReservation(activeReservation.reservation_id);
      await refreshReservations();
      setMessage('Check-out realizado correctamente.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible registrar el check-out.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!activeReservation || !extensionTime) {
      setError('Selecciona una nueva hora de finalización.');
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      await extendReservation(activeReservation.reservation_id, new Date(extensionTime).toISOString());
      await refreshReservations();
      setMessage('La reserva se extendió correctamente.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible extender la reserva.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportIncident = async () => {
    if (!activeReservation || !incidentDescription.trim()) {
      setError('Escribe una descripción para reportar la incidencia.');
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await reportReservationIncident(activeReservation.reservation_id, {
        type: incidentType,
        description: incidentDescription.trim(),
        notes: incidentNotes.trim() || undefined,
      });

      await refreshReservations();
      setMessage(
        result.alternative_space
          ? `Incidencia registrada. Se sugirió reasignación al espacio ${result.alternative_space.code}.`
          : 'Incidencia registrada. No se encontró un espacio alternativo disponible.',
      );
      setIncidentDescription('');
      setIncidentNotes('');
      setIncidentType('occupied');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible reportar la incidencia.');
    } finally {
      setActionLoading(false);
    }
  };

  const canCheckIn = Boolean(activeReservation && activeReservation.status === 'reserved');
  const canCheckOut = Boolean(
    activeReservation && ['checked_in', 'checkout_pending'].includes(activeReservation.status),
  );

  return (
    <div className="mx-auto max-w-6xl py-8">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Check-in y Check-out</h1>
          <p className="text-slate-500">Valida tu presencia, libera el espacio y reporta incidentes desde una sola vista.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <p>Check-in disponible desde 15 min antes hasta 20 min después.</p>
          <p>Se buscará una reasignación si hay conflicto.</p>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reserva activa</p>
                  <h2 className="mt-2 text-2xl font-bold">{activeReservation?.space?.code ?? 'Sin reserva activa'}</h2>
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
                  {activeReservation ? statusLabels[activeReservation.status] : 'Sin estado'}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900"
                  >
                    Cargando tu reserva activa...
                  </motion.div>
                ) : activeReservation ? (
                  <motion.div
                    key={activeReservation.reservation_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    className="space-y-6"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Horario</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {format(new Date(activeReservation.start_time), 'dd/MM/yyyy HH:mm')} - {format(new Date(activeReservation.end_time), 'HH:mm')}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{activeReservation.space?.zone?.name ?? 'Sin zona'} · {activeReservation.space?.space_type?.name ?? 'Espacio'}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Tiempos reales</p>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Check-in: {formatDateTime(activeReservation.check_in_time)}</p>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Check-out: {formatDateTime(activeReservation.check_out_time)}</p>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">No-show: {formatDateTime(activeReservation.no_show_at)}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <button
                        onClick={handleCheckIn}
                        disabled={!canCheckIn || actionLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        <LogIn size={18} />
                        Check-in con ubicación
                      </button>
                      <button
                        onClick={handleCheckOut}
                        disabled={!canCheckOut || actionLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        <LogOut size={18} />
                        Check-out manual
                      </button>
                      <button
                        onClick={handleExtend}
                        disabled={!activeReservation || actionLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <RotateCcw size={18} />
                        Extender reserva
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
                      <label className="block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nueva hora de fin</span>
                        <input
                          type="datetime-local"
                          value={extensionTime}
                          onChange={(event) => setExtensionTime(event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </label>

                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        <div className="flex items-center gap-2 font-semibold">
                          <TriangleAlert size={16} />
                          Regla activa
                        </div>
                        <p className="mt-2">Si tu reserva termina y no liberas el espacio, quedará como checkout pending hasta que lo cierres manualmente.</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900"
                  >
                    No tienes reservas activas para mostrar.
                  </motion.div>
                )}
              </AnimatePresence>

              {activeReservation ? (
                <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50 p-5 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-100">
                    <AlertCircle size={16} />
                    Reportar incidencia
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-800/70 dark:text-fuchsia-100/70">Tipo</span>
                      <select
                        value={incidentType}
                        onChange={(event) => setIncidentType(event.target.value as IncidentType)}
                        className="w-full rounded-xl border border-fuchsia-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500 dark:border-fuchsia-900/40 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="occupied">Espacio ocupado</option>
                        <option value="reassignment">Reasignación</option>
                        <option value="other">Otro</option>
                      </select>
                    </label>

                    <label className="block space-y-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-800/70 dark:text-fuchsia-100/70">Descripción</span>
                      <input
                        value={incidentDescription}
                        onChange={(event) => setIncidentDescription(event.target.value)}
                        placeholder="Describe qué ocurrió"
                        className="w-full rounded-xl border border-fuchsia-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500 dark:border-fuchsia-900/40 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="block space-y-2 md:col-span-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-800/70 dark:text-fuchsia-100/70">Notas opcionales</span>
                      <textarea
                        value={incidentNotes}
                        onChange={(event) => setIncidentNotes(event.target.value)}
                        placeholder="Añade contexto adicional"
                        rows={3}
                        className="w-full rounded-xl border border-fuchsia-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500 dark:border-fuchsia-900/40 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleReportIncident}
                      disabled={!activeReservation || actionLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      <TriangleAlert size={18} />
                      Reportar incidencia
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute left-0 bottom-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Validación</p>
                <h2 className="mt-2 text-2xl font-bold">Geolocalización obligatoria</h2>
                <p className="mt-3 max-w-md text-sm text-slate-300">
                  El check-in solo se aprueba si el dispositivo está dentro de 1000 metros de la oficina.
                </p>
              </div>
              <div className="rounded-full border border-white/15 bg-white/5 p-3 text-cyan-200">
                <LocateFixed size={28} />
              </div>
            </div>
{/* 
            <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-200">
                <MapPin size={16} />
                Ubicación de referencia
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Latitud</p>
                  <p className="mt-1 font-mono">25.650546</p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Longitud</p>
                  <p className="mt-1 font-mono">-100.289857</p>
                </div>
              </div>
            </div>
            
            <div className="relative mt-6 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 py-10">
              <div className="rounded-2xl bg-white p-4 shadow-lg">
                <QrCode size={180} className="text-slate-950" />
              </div>
              <p className="mt-4 max-w-xs text-center text-sm text-slate-300">
                Escanea el QR físico del espacio para complementar la validación de presencia.
              </p>
            </div>
            */}
          </div>
          

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Clock size={16} />
              Resumen rápido
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <CheckCircle size={18} className="mt-0.5 text-emerald-500" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Check-in</p>
                  <p>Disponible desde 15 minutos antes hasta 20 minutos después del inicio.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <RotateCcw size={18} className="mt-0.5 text-blue-500" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Extensión</p>
                  <p>Se valida contra el buffer de otras reservas del mismo espacio.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <TriangleAlert size={18} className="mt-0.5 text-fuchsia-500" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Incidencias</p>
                  <p>Si el espacio está ocupado, se intenta una reasignación simple a otro disponible.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
