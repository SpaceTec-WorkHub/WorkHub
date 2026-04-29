import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  CalendarClock,
  CheckCircle,
  Clock,
  Filter,
  History,
  Search,
  RotateCcw,
  TriangleAlert,
  MapPin,
} from 'lucide-react';
import { getCurrentUserId } from '../../services/auth';
import { getReservationHistory, ReservationRecord } from '../../services/reservation';

const statusLabels: Record<ReservationRecord['status'], string> = {
  reserved: 'Reservada',
  checked_in: 'En curso',
  checked_out: 'Liberada',
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

const historyStatuses = ['all', 'checked_out', 'no_show', 'cancelled', 'incident'] as const;

type HistoryStatusFilter = (typeof historyStatuses)[number];

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Pendiente';
  }

  return format(new Date(value), 'dd/MM/yyyy HH:mm');
};

export default function ReservationHistory() {
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');

  const currentUserId = useMemo(() => getCurrentUserId(), []);

  useEffect(() => {
    if (!currentUserId) {
      setError('No se encontró la sesión del usuario.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getReservationHistory()
      .then((data) => {
        setReservations(data);
        setError('');
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar el historial.');
      })
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const matchesStatus =
        statusFilter === 'all' ? true : reservation.status === statusFilter;
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        `${reservation.space?.code ?? ''} ${reservation.space?.zone?.name ?? ''} ${reservation.space?.space_type?.name ?? ''} ${reservation.incident_notes ?? ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [reservations, searchTerm, statusFilter]);

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
            <p className="text-xs uppercase tracking-wider text-slate-500">Liberadas</p>
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

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por espacio, zona o incidencia"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                  ? 'bg-blue-600 text-white'
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
        <div className="grid grid-cols-1 gap-4">
          {filteredReservations.map((reservation) => (
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
                    {reservation.reassigned_space_id ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-blue-700">
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
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-3 w-fit rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            <CheckCircle size={20} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sin resultados</h3>
          <p className="mt-2 text-sm text-slate-500">Prueba con otro filtro o texto de búsqueda.</p>
        </div>
      )}
    </div>
  );
}
