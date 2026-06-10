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
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { getCurrentUserId, isAdminUser } from '../../services/auth';
import {
  checkInEventReservation,
  checkInReservation,
  checkOutReservation,
  extendReservation,
  getReservationSpaces,
  getUserReservations,
  reportReservationIncident,
  ReservationRecord,
  ReservationSpace,
} from '../../services/reservation';
import { useToast } from '../components/feedback/ToastProvider';

type IncidentType = 'occupied' | 'reassignment' | 'other';

const getSpaceKind = (typeName: string): 'desk' | 'meeting' | 'parking' | 'other' => {
  const n = typeName.toLowerCase();
  if (n.includes('parking')) return 'parking';
  if (n.includes('room') || n.includes('sala') || n.includes('meeting') || n.includes('juntas')) return 'meeting';
  if (n.includes('desk') || n.includes('escritorio')) return 'desk';
  return 'other';
};

const isoToDateStr = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isoToTimeStr = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function AlternativeSpaceSelector({
  spaces,
  spaceTypeName,
  startTime,
  endTime,
  onSelect,
  onDismiss,
}: {
  spaces: ReservationSpace[];
  spaceTypeName: string;
  startTime: string;
  endTime: string;
  onSelect: (space: ReservationSpace) => void;
  onDismiss: () => void;
}) {
  const byZone = useMemo(() => {
    const map = new Map<string, ReservationSpace[]>();
    for (const s of spaces) {
      const zone = s.zone?.name ?? 'Sin zona';
      if (!map.has(zone)) map.set(zone, []);
      map.get(zone)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [spaces]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative z-10 flex w-[min(96vw,680px)] max-h-[85vh] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-100 px-3 py-1 text-[11px] font-semibold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200">
              <TriangleAlert size={13} />
              Espacios alternativos
            </div>
            <h2 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
              ¿Necesitas otro espacio de tipo {spaceTypeName}?
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {format(new Date(startTime), 'dd/MM/yyyy HH:mm')} – {format(new Date(endTime), 'HH:mm')} · Selecciona uno para hacer la nueva reserva, o cierra si no es necesario.
            </p>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Cerrar" className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {spaces.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              No hay espacios alternativos disponibles para este horario.
            </div>
          ) : (
            <div className="space-y-5">
              {byZone.map(([zoneName, zoneSpaces]) => (
                <div key={zoneName}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{zoneName}</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {zoneSpaces.map((space) => (
                      <button
                        key={space.space_id}
                        type="button"
                        onClick={() => onSelect(space)}
                        className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center text-emerald-800 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                      >
                        <span className="text-sm font-bold">{space.code}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-70">Libre</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            No es necesario
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [selectedReservationIndex, setSelectedReservationIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const toast = useToast();
  const [extensionTime, setExtensionTime] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType>('occupied');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [alternativeSpaces, setAlternativeSpaces] = useState<ReservationSpace[]>([]);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [incidentTimeRange, setIncidentTimeRange] = useState<{ start: string; end: string; typeName: string } | null>(null);

  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const isAdmin = useMemo(() => isAdminUser(), []);

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((left, right) => {
      const leftPriority = left.status === 'checked_in' ? 0 : left.status === 'checkout_pending' ? 1 : 2;
      const rightPriority = right.status === 'checked_in' ? 0 : right.status === 'checkout_pending' ? 1 : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(left.start_time).getTime() - new Date(right.start_time).getTime();
    });
  }, [reservations]);

  const activeReservation = useMemo(() => {
    if (sortedReservations.length === 0) return null;
    const index = Math.min(selectedReservationIndex, sortedReservations.length - 1);
    return sortedReservations[index] ?? null;
  }, [sortedReservations, selectedReservationIndex]);

  useEffect(() => {
    if (!currentUserId) {
      setLoadError('No se encontró la sesión del usuario.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserReservations(currentUserId)
      .then((data) => {
        const eligibleReservations = data.filter((res) =>
          ['reserved', 'checked_in', 'checkout_pending'].includes(res.status)
        );
        setReservations(eligibleReservations);
        setSelectedReservationIndex(0);
        setLoadError('');
      })
      .catch((fetchError) => {
        setLoadError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar tus reservas activas.');
      })
      .finally(() => setLoading(false));
  }, [currentUserId]);

  useEffect(() => {
    setExtensionTime(toInputDateTimeValue(activeReservation?.end_time ?? null));
  }, [activeReservation]);

  const refreshReservations = async () => {
    if (!currentUserId) return;
    const data = await getUserReservations(currentUserId);
    const eligibleReservations = data.filter((res) => 
      ['reserved', 'checked_in', 'checkout_pending'].includes(res.status)
    );
    setReservations(eligibleReservations);
    setSelectedReservationIndex(0);
  };

  const handleCheckIn = async () => {
    if (!activeReservation) {
      return;
    }
    // Validacion defensiva: comprobar ventana de check-in vigente
    if (!canCheckInWindow) {
      toast.error('El check-in solo está disponible desde 15 minutos antes del inicio y hasta la hora final de la reserva.');
      return;
    }

    setActionLoading(true);

    try {
      const location = await requestCurrentLocation();
      await checkInReservation(activeReservation.reservation_id, location);
      await refreshReservations();
      toast.success('Check-in registrado correctamente.');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'No fue posible registrar el check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEventCheckIn = async () => {
    if (!activeReservation) {
      return;
    }

    if (!isAdmin || !activeReservation.event_id) {
      toast.error('Solo un administrador puede hacer check-in de evento.');
      return;
    }

    if (!canCheckInWindow) {
      toast.error('El check-in solo está disponible desde 15 minutos antes del inicio y hasta la hora final de la reserva.');
      return;
    }

    setActionLoading(true);

    try {
      const location = await requestCurrentLocation();
      const result = await checkInEventReservation(activeReservation.reservation_id, location);
      await refreshReservations();
      toast.success(`Check-in de evento registrado correctamente. Se actualizaron ${result.checked_in_count} reservas.`);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'No fue posible registrar el check-in del evento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeReservation) {
      return;
    }

    setActionLoading(true);

    try {
      await checkOutReservation(activeReservation.reservation_id);
      await refreshReservations();
      toast.success('Check-out realizado correctamente.');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'No fue posible registrar el check-out.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!activeReservation || !extensionTime) {
      toast.error('Selecciona una nueva hora de finalización.');
      return;
    }

    setActionLoading(true);

    try {
      await extendReservation(activeReservation.reservation_id, new Date(extensionTime).toISOString());
      await refreshReservations();
      toast.success('La reserva se extendió correctamente.');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'No fue posible extender la reserva.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportIncident = async () => {
    if (!activeReservation || !incidentDescription.trim()) {
      toast.error('Escribe una descripción para reportar la incidencia.');
      return;
    }

    setActionLoading(true);

    // Capture reservation info before refreshing (activeReservation may change)
    const resStart = activeReservation.start_time;
    const resEnd = activeReservation.end_time;
    const resSpaceId = activeReservation.space_id;
    const spaceTypeName = activeReservation.space?.space_type?.name ?? 'Espacio';
    const spaceKind = getSpaceKind(spaceTypeName);

    try {
      await reportReservationIncident(activeReservation.reservation_id, {
        type: incidentType,
        description: incidentDescription.trim(),
        notes: incidentNotes.trim() || undefined,
      });

      await refreshReservations();
      toast.success('Incidencia registrada. Revisa los espacios alternativos disponibles.');
      setIncidentDescription('');
      setIncidentNotes('');
      setIncidentType('occupied');

      // Fetch alternative spaces of the same type (without userId to avoid type-conflict filtering)
      try {
        const dateStr = isoToDateStr(resStart);
        const startStr = isoToTimeStr(resStart);
        const endStr = isoToTimeStr(resEnd);
        const available = await getReservationSpaces(dateStr, startStr, endStr);
        const alternatives = available.filter(
          (s) => getSpaceKind(s.space_type?.name ?? '') === spaceKind && s.space_id !== resSpaceId,
        );
        setAlternativeSpaces(alternatives);
        setIncidentTimeRange({ start: resStart, end: resEnd, typeName: spaceTypeName });
        setShowAlternativeModal(true);
      } catch {
        // If fetching alternatives fails, just show the success message without the modal
      }
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'No fue posible reportar la incidencia.');
    } finally {
      setActionLoading(false);
    }
  };
  const handleSelectAlternative = (space: ReservationSpace) => {
    if (!incidentTimeRange) return;
    navigate('/reservation', {
      state: {
        date: isoToDateStr(incidentTimeRange.start),
        startTime: isoToTimeStr(incidentTimeRange.start),
        endTime: isoToTimeStr(incidentTimeRange.end),
        spaceId: space.space_id,
        spaceCode: space.code,
      },
    });
  };

  const canCheckIn = Boolean(activeReservation && activeReservation.status === 'reserved');
  const canCheckInEvent = Boolean(
    isAdmin && activeReservation && activeReservation.status === 'reserved' && activeReservation.event_id,
  );
  const canCheckOut = Boolean(
    activeReservation && ['checked_in', 'checkout_pending'].includes(activeReservation.status),
  );

  const checkInWindowRange = useMemo(() => {
    if (!activeReservation || !activeReservation.start_time || !activeReservation.end_time) return null;
    const start = new Date(activeReservation.start_time);
    const end = new Date(activeReservation.end_time);
    const allowedStart = new Date(start.getTime() - 15 * 60 * 1000);
    const allowedEnd = end;
    return { allowedStart, allowedEnd };
  }, [activeReservation]);

  const canCheckInWindow = useMemo(() => {
    if (!activeReservation || activeReservation.status !== 'reserved' || !checkInWindowRange) return false;
    const now = new Date();
    return now >= checkInWindowRange.allowedStart && now <= checkInWindowRange.allowedEnd;
  }, [activeReservation, checkInWindowRange]);

  return (
    <div className="mx-auto max-w-6xl py-8">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Check-in y Check-out</h1>
          <p className="text-slate-500">Valida tu presencia, libera el espacio y reporta incidentes desde una sola vista.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <p>Check-in disponible desde 15 min antes y hasta el fin de la reserva.</p>
          <p>Se buscará una reasignación si hay conflicto.</p>
        </div>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-purple-950 px-6 py-5 text-white">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reserva activa</p>
                    <h2 className="mt-2 text-2xl font-bold">{activeReservation?.space?.code ?? 'Sin reserva activa'}</h2>
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
                    {activeReservation ? statusLabels[activeReservation.status] : 'Sin estado'}
                  </div>
                </div>
                {sortedReservations.length > 1 ? (
                  <div className="pt-2 border-t border-white/10">
                    <label className="block space-y-2">
                      <p className="text-xs uppercase tracking-wider text-slate-300">Seleccionar reserva</p>
                      <select
                        value={selectedReservationIndex}
                        onChange={(event) => setSelectedReservationIndex(parseInt(event.target.value, 10))}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none backdrop-blur-sm focus:border-white/40 transition-colors"
                      >
                        {sortedReservations.map((res, idx) => (
                          <option key={res.reservation_id} value={idx} className="bg-slate-900 text-white">
                            {format(new Date(res.start_time), 'dd/MM HH:mm')} - {res.space?.code} ({statusLabels[res.status]})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
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

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                      <button
                        onClick={handleCheckIn}
                        disabled={!canCheckInWindow || actionLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        <LogIn size={18} />
                        Check-in con ubicación
                      </button>
                      <button
                        onClick={handleEventCheckIn}
                        disabled={!canCheckInEvent || actionLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        <CheckCircle size={18} />
                        Check-in del evento
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

                    {canCheckIn && !canCheckInWindow && checkInWindowRange ? (
                      <div className="mt-2 text-sm text-slate-500">
                        Check-in disponible desde {format(checkInWindowRange.allowedStart, 'dd/MM/yyyy HH:mm')} hasta {format(checkInWindowRange.allowedEnd, 'dd/MM/yyyy HH:mm')}.
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
                      <label className="block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nueva hora de fin</span>
                        <input
                          type="datetime-local"
                          value={extensionTime}
                          onChange={(event) => setExtensionTime(event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950 to-purple-900 p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.35),transparent_30%)]" />

            <div className="relative z-10 flex items-start justify-between gap-4">
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
                <RotateCcw size={18} className="mt-0.5 text-purple-500" />
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

      {showAlternativeModal && incidentTimeRange ? (
        <AlternativeSpaceSelector
          spaces={alternativeSpaces}
          spaceTypeName={incidentTimeRange.typeName}
          startTime={incidentTimeRange.start}
          endTime={incidentTimeRange.end}
          onSelect={handleSelectAlternative}
          onDismiss={() => setShowAlternativeModal(false)}
        />
      ) : null}
    </div>
  );
}
