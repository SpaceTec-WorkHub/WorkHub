import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  CalendarClock,
  CheckCircle,
  Clock,
  ChevronDown,
  PencilLine,
  Filter,
  History,
  Search,
  RotateCcw,
  TriangleAlert,
  MapPin,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { getCurrentUserId, isAdminUser } from '../../services/auth';
import { cancelReservation, getUserReservations, updateReservation, ReservationRecord } from '../../services/reservation';
import { useToast } from '../components/feedback/ToastProvider';
import { useConfirm } from '../components/feedback/ConfirmProvider';

const statusLabels: Record<ReservationRecord['status'], string> = {
  reserved: 'Reservada',
  checked_in: 'En curso',
  checked_out: 'Finalizadas',
  no_show: 'No-show',
  cancelled: 'Cancelada',
  checkout_pending: 'Checkout pendiente',
  incident: 'Incidencia',
};

const statusStyles: Record<ReservationRecord['status'], string> = {
  reserved: 'bg-amber-100 text-amber-800 border-amber-200',
  checked_in: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  checked_out: 'bg-slate-100 text-slate-700 border-slate-200',
  no_show: 'bg-rose-100 text-rose-800 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  checkout_pending: 'bg-orange-100 text-orange-800 border-orange-200',
  incident: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
};

const historyStatuses = [
  'all',
  'reserved',
  'checked_in',
  'checked_out',
  'checkout_pending',
  'no_show',
  'cancelled',
  'incident',
] as const;

type HistoryStatusFilter = (typeof historyStatuses)[number];

type ReservationHistoryGroup = {
  key: string;
  title: string;
  subtitle: string;
  reservations: ReservationRecord[];
  sortKey: number;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Pendiente';
  }

  return format(new Date(value), 'dd/MM/yyyy HH:mm');
};

const formatReservationRange = (reservation: ReservationRecord) =>
  `${format(new Date(reservation.start_time), 'dd/MM/yyyy HH:mm')} - ${format(new Date(reservation.end_time), 'HH:mm')}`;

const isoToDate = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');
const isoToTime = (iso: string) => format(new Date(iso), 'HH:mm');
const buildIso = (date: string, time: string) => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
};
const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function ReservationCard({
  reservation,
  onAction,
  onEditSuccess,
}: {
  reservation: ReservationRecord;
  onAction: (reservation: ReservationRecord) => void;
  onEditSuccess: () => void;
}) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(() => isoToDate(reservation.start_time));
  const [editStart, setEditStart] = useState(() => isoToTime(reservation.start_time));
  const [editEnd, setEditEnd] = useState(() => isoToTime(reservation.end_time));
  const [editLoading, setEditLoading] = useState(false);

  const handleOpenEdit = () => {
    setEditDate(isoToDate(reservation.start_time));
    setEditStart(isoToTime(reservation.start_time));
    setEditEnd(isoToTime(reservation.end_time));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editDate || !editStart || !editEnd) {
      toast.error('Completa todos los campos de horario.');
      return;
    }
    const newStart = buildIso(editDate, editStart);
    const newEnd = buildIso(editDate, editEnd);
    if (new Date(newEnd) <= new Date(newStart)) {
      toast.error('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    if (new Date(newEnd) <= new Date()) {
      toast.error('El horario seleccionado ya terminó.');
      return;
    }
    setEditLoading(true);
    try {
      await updateReservation(reservation.reservation_id, { start_time: newStart, end_time: newEnd });
      toast.success('Horario actualizado correctamente.');
      setIsEditing(false);
      onEditSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'El horario no está disponible o es inválido.');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <motion.article
      key={reservation.reservation_id}
      whileHover={{ y: -2 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={[
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider',
              statusStyles[reservation.status],
            ].join(' ')}>
              <CalendarClock size={12} />
              {statusLabels[reservation.status]}
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{reservation.space?.code ?? 'Sin espacio'}</span>
            <span className="text-sm text-slate-500">{reservation.space?.space_type?.name ?? 'Espacio'}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wider text-slate-500">Horario programado</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {format(new Date(reservation.start_time), 'dd/MM/yyyy HH:mm')}
              </p>
              <p className="text-sm text-slate-500">{format(new Date(reservation.end_time), 'HH:mm')}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wider text-slate-500">Check-in real</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(reservation.check_in_time)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wider text-slate-500">Check-out real</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(reservation.check_out_time)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wider text-slate-500">No-show</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(reservation.no_show_at)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-700">
              <MapPin size={14} />
              {reservation.space?.zone?.name ?? 'Sin zona'}
            </span>
            {reservation.event ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                <CalendarClock size={14} />
                {reservation.event.title}
              </span>
            ) : null}
            {reservation.reassigned_space_id ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                <RotateCcw size={14} />
                Reasignado a espacio #{reservation.reassigned_space_id}
              </span>
            ) : null}
          </div>
        </div>

        <div className="max-w-lg space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Clock size={16} />
            Incidencias y notas
          </div>
          {reservation.incident_notes ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">{reservation.incident_notes}</p>
          ) : (
            <p className="text-sm text-slate-500">Sin notas registradas.</p>
          )}

          {reservation.incidents && reservation.incidents.length > 0 ? (
            <div className="space-y-2 pt-2">
              {reservation.incidents.map((incident) => (
                <div key={incident.incident_id} className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-3 text-sm text-fuchsia-900 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20 dark:text-fuchsia-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-wider text-xs">
                      <TriangleAlert size={12} />
                      {incident.type}
                    </span>
                    <span className="text-xs opacity-80">{format(new Date(incident.created_at), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  <p className="mt-2 text-sm">{incident.description}</p>
                </div>
              ))}
            </div>
          ) : null}

          {reservation.guests && reservation.guests.length > 0 ? (
            <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Users size={13} />
                Invitados ({reservation.guests.length})
              </div>
              <div className="space-y-1.5">
                {reservation.guests.map((guest) => (
                  <div key={guest.guest_id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{guest.name}</span>
                    {guest.email ? (
                      <span className="text-slate-400">·</span>
                    ) : null}
                    {guest.email ? (
                      <span className="text-slate-500 dark:text-slate-400">{guest.email}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {reservation.status === 'reserved' ? (
        <>
          {isEditing ? (
            <div className="border-t border-slate-200 px-5 py-5 space-y-4 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Editar horario</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</span>
                  <input
                    type="date"
                    value={editDate}
                    min={todayStr()}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inicio</span>
                  <input
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fin</span>
                  <input
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancelar edición
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onAction(reservation)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <PencilLine size={16} />
                Editar horario
              </button>
            </div>
          )}
        </>
      ) : null}
    </motion.article>
  );
}

function AdminEventGroupCard({
  group,
  isExpanded,
  onToggle,
  onAction,
  onEditSuccess,
}: {
  group: ReservationHistoryGroup;
  isExpanded: boolean;
  onToggle: (groupKey: string) => void;
  onAction: (reservation: ReservationRecord) => void;
  onEditSuccess: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => onToggle(group.key)}
        aria-expanded={isExpanded}
        className="flex w-full items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Agrupación de evento</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{group.title}</h3>
            <p className="text-sm text-slate-500">{group.subtitle}</p>
          </div>
          <div className="mt-1 text-xs font-medium text-slate-400">
            {group.key === 'sin-evento'
              ? 'Reservaciones individuales'
              : `Primera reservación: ${formatReservationRange(group.reservations[0])}`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
            {group.reservations.length} reservación{group.reservations.length === 1 ? '' : 'es'}
          </div>
          <div className={[
            'flex h-9 w-9 items-center justify-center rounded-full border transition-transform duration-200',
            isExpanded
              ? 'rotate-180 border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
          ].join(' ')}>
            <ChevronDown size={16} />
          </div>
        </div>
      </button>

      {isExpanded ? (
        <div className="grid gap-4 p-5">
          {group.reservations.map((reservation) => (
            <ReservationCard
              key={reservation.reservation_id}
              reservation={reservation}
              onAction={onAction}
              onEditSuccess={onEditSuccess}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function ReservationHistory() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const isAdmin = useMemo(() => isAdminUser(), []);
  const toast = useToast();
  const { confirm } = useConfirm();

  const currentUserId = useMemo(() => getCurrentUserId(), []);

  useEffect(() => {
    if (!currentUserId) {
      setError('No se encontró la sesión del usuario.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserReservations(currentUserId)
      .then((data) => {
        setReservations(data);
        setError('');
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar el historial.');
      })
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const handleReservationAction = async (reservation: ReservationRecord) => {
    if (reservation.status !== 'reserved') return;
    const confirmed = await confirm({
      title: 'Cancelar reservación',
      description: '¿Deseas cancelar esta reservación? Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await cancelReservation(reservation.reservation_id);
      toast.success('La reservación fue cancelada correctamente.');
      if (currentUserId) {
        setReservations(await getUserReservations(currentUserId));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible cancelar la reservación.');
    }
  };

  const handleEditSuccess = async () => {
    if (!currentUserId) return;
    try {
      setReservations(await getUserReservations(currentUserId));
    } catch {
      // silent refresh failure
    }
  };

  const handleViewAvailability = (reservation: ReservationRecord) => {
    navigate('/reservation', {
      state: {
        spaceId: reservation.space_id,
        spaceCode: reservation.space?.code,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
      },
    });
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const matchesStatus =
        statusFilter === 'all' ? true : reservation.status === statusFilter;
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        `${reservation.space?.code ?? ''} ${reservation.space?.zone?.name ?? ''} ${reservation.space?.space_type?.name ?? ''} ${reservation.incident_notes ?? ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesDate =
        dateFilter.trim().length === 0 ||
        format(new Date(reservation.start_time), 'yyyy-MM-dd') === dateFilter;

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [reservations, searchTerm, statusFilter, dateFilter]);

  const groupedReservations = useMemo(() => {
    if (!isAdmin) {
      return [];
    }

    const groupedByEvent = new Map<string, ReservationHistoryGroup>();
    const standaloneReservations: ReservationRecord[] = [];

    for (const reservation of filteredReservations) {
      if (reservation.event_id && reservation.event) {
        const eventKey = String(reservation.event_id);
        const existingGroup = groupedByEvent.get(eventKey);
        const groupTitle = reservation.event.title || `Evento #${reservation.event_id}`;
        const groupSubtitle = reservation.event.start_time && reservation.event.end_time
          ? `${format(new Date(reservation.event.start_time), 'dd/MM/yyyy HH:mm')} - ${format(new Date(reservation.event.end_time), 'HH:mm')}`
          : `Evento #${reservation.event_id}`;

        if (existingGroup) {
          existingGroup.reservations.push(reservation);
          existingGroup.sortKey = Math.min(existingGroup.sortKey, new Date(reservation.start_time).getTime());
          continue;
        }

        groupedByEvent.set(eventKey, {
          key: eventKey,
          title: groupTitle,
          subtitle: groupSubtitle,
          reservations: [reservation],
          sortKey: new Date(reservation.start_time).getTime(),
        });
        continue;
      }

      standaloneReservations.push(reservation);
    }

    const eventGroups = Array.from(groupedByEvent.values()).sort((left, right) => left.sortKey - right.sortKey);
    const standaloneGroup: ReservationHistoryGroup | null = standaloneReservations.length > 0
      ? {
          key: 'sin-evento',
          title: 'Reservaciones sin evento',
          subtitle: 'Reservaciones creadas de forma individual',
          reservations: standaloneReservations.sort((left, right) => new Date(right.start_time).getTime() - new Date(left.start_time).getTime()),
          sortKey: standaloneReservations.length > 0 ? Math.min(...standaloneReservations.map((reservation) => new Date(reservation.start_time).getTime())) : Number.MAX_SAFE_INTEGER,
        }
      : null;

    return standaloneGroup ? [...eventGroups, standaloneGroup] : eventGroups;
  }, [filteredReservations, isAdmin]);

  const handleToggleGroup = (groupKey: string) => {
    setExpandedGroups((currentExpandedGroups) => ({
      ...currentExpandedGroups,
      [groupKey]: currentExpandedGroups[groupKey] ?? true ? false : true,
    }));
  };

  const summary = useMemo(() => {
    return reservations.reduce(
      (accumulator, reservation) => {
        accumulator.total += 1;
        if (reservation.status === 'checked_out') accumulator.checkedOut += 1;
        if (reservation.status === 'no_show') accumulator.noShow += 1;
        if (reservation.status === 'incident') accumulator.incidents += 1;
        if (reservation.status === 'cancelled') accumulator.cancelled += 1;
        return accumulator;
      },
      { total: 0, checkedOut: 0, noShow: 0, incidents: 0, cancelled: 0 },
    );
  }, [reservations]);

  return (
    <div className="mx-auto max-w-7xl py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <History size={14} />
            Historial de reservas
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Actividad y estados reales</h1>
          <p className="text-slate-500">Consulta reservas completadas, no-shows, incidencias y los tiempos reales de entrada y salida.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">Finalizadas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.checkedOut}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">No-shows</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.noShow}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-500">Incidencias</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.incidents}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Filtro de día */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <CalendarClock size={15} />
          Filtrar por día
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus-within:border-purple-500 dark:border-slate-700 dark:bg-slate-900">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-200"
          />
        </label>
        {dateFilter ? (
          <>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
              {format(new Date(dateFilter + 'T00:00:00'), 'dd/MM/yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              Quitar filtro
            </button>
          </>
        ) : (
          <span className="text-xs text-slate-400">Mostrando todos los días</span>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por espacio, zona o incidencia"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {historyStatuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
              ].join(' ')}
            >
              <Filter size={16} />
              {status === 'all' ? 'Todas' : statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          Cargando historial...
        </div>
      ) : filteredReservations.length > 0 ? (
        isAdmin ? (
          <div className="space-y-4">
            {groupedReservations.map((group) => (
              <AdminEventGroupCard
                key={group.key}
                group={group}
                isExpanded={expandedGroups[group.key] ?? true}
                onToggle={handleToggleGroup}
                onAction={handleReservationAction}
                onEditSuccess={handleEditSuccess}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReservations.map((reservation) => (
              <ReservationCard
                key={reservation.reservation_id}
                reservation={reservation}
                onAction={handleReservationAction}
                onEditSuccess={handleEditSuccess}
              />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-3 w-fit rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            <CheckCircle size={20} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sin resultados</h3>
          <p className="mt-2 text-sm text-slate-500">
            {dateFilter
              ? `No hay reservaciones el ${format(new Date(dateFilter + 'T00:00:00'), 'dd/MM/yyyy')}. Prueba con otra fecha o quita el filtro.`
              : 'Prueba con otro filtro o texto de búsqueda.'}
          </p>
        </div>
      )}
    </div>
  );
}
