import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Car,
  MapPin,
  Clock,
  Plus,
  Search,
  ExternalLink,
  Users,
  CalendarDays,
  Loader2,
  CheckCircle2,
  Info,
  Eye,
  History,
  X,
  Play,
  Flag,
  ThumbsUp,
  ThumbsDown,
  XCircle,
  ListChecks,
  PlusCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getCurrentUserId } from '../../services/auth';
import { useToast } from '../components/feedback/ToastProvider';
import { useConfirm } from '../components/feedback/ConfirmProvider';
import {
  getCarpoolTrips,
  getVehiclesByOwner,
  getTripsByDriver,
  createCarpoolTrip,
  requestRide,
  cancelRide,
  acceptRider,
  rejectRider,
  startTrip,
  confirmMeetingPoint,
  completeTrip,
  cancelTrip,
  googleMapsSearchUrl,
  CarpoolTrip,
  TripRider,
  Vehicle,
} from '../../services/carpool';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTripDate(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  };
}

function tripDateToInputValue(iso: string) {
  // 'en-CA' formats as YYYY-MM-DD, matching <input type="date"> values.
  return new Date(iso).toLocaleDateString('en-CA');
}

function buildTripDateIso(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return null;
  const combined = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined.toISOString();
}

function describeRideProgress(trip: CarpoolTrip, riderStatus: string) {
  if (riderStatus === 'requested') {
    return 'Esperando que el conductor confirme tu lugar.';
  }
  if (riderStatus === 'rejected') {
    return 'El conductor rechazó tu solicitud.';
  }
  if (riderStatus === 'cancelled') {
    return 'Esta solicitud fue cancelada.';
  }

  // Rider already accepted/boarded/completed: describe where the trip itself stands.
  switch (trip.status) {
    case 'open':
    case 'full':
      return 'Confirmado · el conductor todavía no inicia el viaje (pendiente de iniciar).';
    case 'in_progress':
      return trip.meeting_point_confirmed_at
        ? 'El conductor ya pasó por el punto de encuentro · el viaje va en curso.'
        : 'El conductor ya inició el viaje y va en camino al punto de encuentro.';
    case 'completed':
      return 'El viaje ya terminó.';
    case 'cancelled':
      return trip.cancellation_reason
        ? `El conductor canceló este viaje. Motivo: "${trip.cancellation_reason}"`
        : 'El conductor canceló este viaje.';
    default:
      return '';
  }
}

function initials(name?: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const ACTIVE_RIDER_STATUSES = ['requested', 'accepted', 'boarded'];
const FINISHED_TRIP_STATUSES = ['completed', 'cancelled'];

const TRIP_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  full: 'Sin asientos',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const TRIP_STATUS_STYLES: Record<string, string> = {
  draft: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300',
  open: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  full: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  in_progress: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  completed: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300',
  cancelled: 'text-red-600 bg-red-50 dark:bg-red-900/30',
};

const RIDER_STATUS_LABELS: Record<string, string> = {
  requested: 'Pendiente de confirmación',
  accepted: 'Confirmada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  boarded: 'A bordo',
  no_show: 'No se presentó',
  completed: 'Completada',
};

const RIDER_STATUS_BADGE_STYLES: Record<string, string> = {
  requested: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  accepted: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  boarded: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  rejected: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  cancelled: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300',
  no_show: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  completed: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300',
};

// ── componente principal ──────────────────────────────────────────────────────

export default function Carpool() {
  const currentUserId = getCurrentUserId();
  const toast = useToast();
  const { confirm, promptText } = useConfirm();
  const [activeTab, setActiveTab] = useState<'find' | 'offer'>('find');

  // Trips
  const [trips, setTrips] = useState<CarpoolTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tripsError, setTripsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Per-trip request/cancel action state
  const [actionTripId, setActionTripId] = useState<number | null>(null);
  const [showActiveRideDetails, setShowActiveRideDetails] = useState(false);
  const [showRideHistory, setShowRideHistory] = useState(false);

  // Vehicles for "offer ride"
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Offer form state
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [tripTime, setTripTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [notes, setNotes] = useState('');
  const [publishing, setPublishing] = useState(false);

  // "Ofrecer Viaje" view: publish form vs. "Mis viajes"
  const [offerView, setOfferView] = useState<'publish' | 'myTrips'>('publish');
  const [myTrips, setMyTrips] = useState<CarpoolTrip[]>([]);
  const [loadingMyTrips, setLoadingMyTrips] = useState(false);
  const [myTripsError, setMyTripsError] = useState('');
  const [tripActionId, setTripActionId] = useState<number | null>(null);
  const [riderActionKey, setRiderActionKey] = useState<string | null>(null);

  const loadTrips = () => {
    setLoadingTrips(true);
    setTripsError('');
    getCarpoolTrips()
      .then((data) => setTrips(data ?? []))
      .catch((err: Error) => setTripsError(err.message || 'No se pudieron cargar los viajes'))
      .finally(() => setLoadingTrips(false));
  };

  const loadMyTrips = () => {
    if (!currentUserId) return;
    setLoadingMyTrips(true);
    setMyTripsError('');
    getTripsByDriver(currentUserId)
      .then((data) => setMyTrips(data ?? []))
      .catch((err: Error) => setMyTripsError(err.message || 'No se pudieron cargar tus viajes'))
      .finally(() => setLoadingMyTrips(false));
  };

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (activeTab === 'offer' && offerView === 'myTrips') {
      loadMyTrips();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, offerView, currentUserId]);

  useEffect(() => {
    if (!currentUserId) { setLoadingVehicles(false); return; }
    setLoadingVehicles(true);
    getVehiclesByOwner(currentUserId)
      .then((data) => setVehicles((data ?? []).filter((v) => v.is_active)))
      .catch(() => setVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, [currentUserId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.vehicle_id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  // Active ride request the current user already has (if any)
  const myActiveRide = useMemo(() => {
    if (!currentUserId) return null;
    for (const trip of trips) {
      const rider = trip.tripRiders?.find((r) => r.user_id === currentUserId);
      if (
        rider &&
        ACTIVE_RIDER_STATUSES.includes(rider.status) &&
        !FINISHED_TRIP_STATUSES.includes(trip.status)
      ) {
        return { trip, rider };
      }
    }
    return null;
  }, [trips, currentUserId]);

  // Past ride requests for the current user as a rider (finished trips or terminal request states)
  const myRideHistory = useMemo(() => {
    if (!currentUserId) return [];
    const entries: { trip: CarpoolTrip; rider: TripRider }[] = [];
    for (const trip of trips) {
      const rider = trip.tripRiders?.find((r) => r.user_id === currentUserId);
      if (!rider) continue;
      const requestIsTerminal = ['rejected', 'cancelled', 'completed', 'no_show'].includes(rider.status);
      const tripIsFinished = FINISHED_TRIP_STATUSES.includes(trip.status);
      if (requestIsTerminal || tripIsFinished) {
        entries.push({ trip, rider });
      }
    }
    return entries.sort((a, b) => new Date(b.trip.trip_date).getTime() - new Date(a.trip.trip_date).getTime());
  }, [trips, currentUserId]);

  const now = new Date();
  const visibleTrips = useMemo(() => {
    return trips
      .filter((trip) => trip.driver_id !== currentUserId)
      .filter((trip) => !FINISHED_TRIP_STATUSES.includes(trip.status))
      .filter((trip) => new Date(trip.trip_date) >= now)
      .filter((trip) => {
        // Once the driver rejects a request, that trip is no longer offered to this user.
        const myRiderEntry = trip.tripRiders?.find((r) => r.user_id === currentUserId);
        return myRiderEntry?.status !== 'rejected';
      })
      .filter((trip) =>
        searchQuery.trim()
          ? trip.origin.toLowerCase().includes(searchQuery.trim().toLowerCase())
          : true,
      )
      .filter((trip) =>
        dateFilter ? tripDateToInputValue(trip.trip_date) === dateFilter : true,
      )
      .sort((a, b) => new Date(a.trip_date).getTime() - new Date(b.trip_date).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, currentUserId, searchQuery, dateFilter]);

  const handleRequestRide = async (trip: CarpoolTrip) => {
    if (!currentUserId) return;
    setActionTripId(trip.trip_id);
    try {
      await requestRide(trip.trip_id, currentUserId);
      toast.success('¡Solicitud enviada! Se reservó tu lugar en el viaje.');
      loadTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo solicitar el viaje');
    } finally {
      setActionTripId(null);
    }
  };

  const handleCancelRide = async (trip: CarpoolTrip) => {
    if (!currentUserId) return;
    setActionTripId(trip.trip_id);
    try {
      await cancelRide(trip.trip_id, currentUserId);
      toast.success('Tu solicitud fue cancelada y el lugar quedó disponible de nuevo.');
      setShowActiveRideDetails(false);
      loadTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar la solicitud');
    } finally {
      setActionTripId(null);
    }
  };

  const handleStartTrip = async (trip: CarpoolTrip) => {
    if (!currentUserId) return;
    setTripActionId(trip.trip_id);
    try {
      await startTrip(trip.trip_id, currentUserId);
      toast.success('¡Viaje iniciado! Ya puedes confirmar el punto de encuentro cuando llegues.');
      loadMyTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar el viaje');
    } finally {
      setTripActionId(null);
    }
  };

  const handleConfirmMeetingPoint = async (trip: CarpoolTrip) => {
    if (!currentUserId) return;
    const ok = await confirm({
      title: 'Confirmar punto de encuentro',
      description: '¿Ya llegaste al punto de encuentro y subiste a tus pasajeros? Les avisaremos que el recorrido continúa hacia el destino.',
      confirmLabel: 'Sí, ya llegué',
      tone: 'default',
    });
    if (!ok) return;

    setTripActionId(trip.trip_id);
    try {
      await confirmMeetingPoint(trip.trip_id, currentUserId);
      toast.success('Listo: marcaste que ya pasaste por el punto de encuentro. Cuando llegues al destino, presiona "Finalizar viaje".');
      loadMyTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo confirmar el punto de encuentro');
    } finally {
      setTripActionId(null);
    }
  };

  const handleCompleteTrip = async (trip: CarpoolTrip) => {
    if (!currentUserId) return;
    const ok = await confirm({
      title: 'Finalizar viaje',
      description: '¿Ya llegaron al destino y el recorrido terminó? El viaje se marcará como completado para ti y tus pasajeros.',
      confirmLabel: 'Sí, finalizar viaje',
      tone: 'default',
    });
    if (!ok) return;

    setTripActionId(trip.trip_id);
    try {
      await completeTrip(trip.trip_id, currentUserId);
      toast.success('¡Viaje terminado! Se marcó como completado para ti y tus pasajeros.');
      loadMyTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo terminar el viaje');
    } finally {
      setTripActionId(null);
    }
  };

  const handleCancelTrip = async (trip: CarpoolTrip) => {
    if (!currentUserId) return;
    const ok = await confirm({
      title: 'Cancelar viaje',
      description: '¿Seguro que quieres cancelar este viaje? Se notificará a tus pasajeros y no podrás deshacer esta acción.',
      confirmLabel: 'Sí, cancelar viaje',
      tone: 'danger',
    });
    if (!ok) return;

    const reason = await promptText({
      title: 'Motivo de la cancelación',
      description: 'Cuéntales brevemente a tus pasajeros por qué cancelas este viaje; verán este mensaje en su notificación.',
      placeholder: 'Ejemplo: tuve una emergencia y no podré hacer el recorrido hoy.',
      confirmLabel: 'Cancelar viaje',
    });
    if (reason === null) return;

    setTripActionId(trip.trip_id);
    try {
      await cancelTrip(trip.trip_id, currentUserId, reason);
      toast.success('El viaje fue cancelado. Tus pasajeros quedaron desvinculados de él y verán el motivo de la cancelación.');
      loadMyTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar el viaje');
    } finally {
      setTripActionId(null);
    }
  };

  const handleAcceptRider = async (trip: CarpoolTrip, rider: TripRider) => {
    if (!currentUserId) return;
    const key = `${trip.trip_id}-${rider.user_id}`;
    setRiderActionKey(key);
    try {
      await acceptRider(trip.trip_id, rider.user_id, currentUserId);
      toast.success(`Aceptaste a ${rider.user?.full_name ?? 'el pasajero'} en este viaje.`);
      loadMyTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo aceptar la solicitud');
    } finally {
      setRiderActionKey(null);
    }
  };

  const handleRejectRider = async (trip: CarpoolTrip, rider: TripRider) => {
    if (!currentUserId) return;
    const key = `${trip.trip_id}-${rider.user_id}`;
    setRiderActionKey(key);
    try {
      await rejectRider(trip.trip_id, rider.user_id, currentUserId);
      toast.success(`Rechazaste la solicitud de ${rider.user?.full_name ?? 'el pasajero'}. Su asiento quedó disponible de nuevo.`);
      loadMyTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo rechazar la solicitud');
    } finally {
      setRiderActionKey(null);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    if (!selectedVehicle) {
      toast.error('Selecciona el vehículo con el que ofrecerás el viaje.');
      return;
    }
    if (!origin.trim() || !destination.trim()) {
      toast.error('Indica el origen y el destino del viaje.');
      return;
    }

    const tripDateIso = buildTripDateIso(tripDate, tripTime);
    if (!tripDateIso) {
      toast.error('Indica una fecha y hora válidas para el punto de encuentro.');
      return;
    }
    if (new Date(tripDateIso) <= new Date()) {
      toast.error('La fecha y hora del viaje deben ser futuras.');
      return;
    }

    let departureTimeIso: string | undefined;
    if (departureTime.trim()) {
      const built = buildTripDateIso(tripDate, departureTime);
      if (!built) {
        toast.error('Indica una hora de salida válida.');
        return;
      }
      // The departure time can be earlier than the meeting point time (e.g. departing
      // from the origin before arriving at the meeting point), so no ordering is enforced here.
      departureTimeIso = built;
    }

    setPublishing(true);
    try {
      await createCarpoolTrip({
        trip_date: tripDateIso,
        departure_time: departureTimeIso,
        vehicle_id: selectedVehicle.vehicle_id,
        origin: origin.trim(),
        destination: destination.trim(),
        meeting_point: meetingPoint.trim() || undefined,
        notes: notes.trim() || undefined,
        driver_id: currentUserId,
      });
      toast.success('¡Viaje publicado! Ya aparece disponible para que otros lo soliciten.');
      setSelectedVehicleId(null);
      setOrigin('');
      setDestination('');
      setMeetingPoint('');
      setTripDate('');
      setTripTime('');
      setDepartureTime('');
      setNotes('');
      loadTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el viaje');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">WorkHub Carpool</h1>
          <p className="text-slate-500">Comparte tu viaje, reduce el tráfico y gana puntos.</p>
        </div>
        <div className="self-start sm:self-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
          <Car size={16} /> 250 pts por viaje
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('find')}
            className={clsx(
              'flex-1 py-4 text-center font-medium text-sm transition-colors',
              activeTab === 'find' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600 dark:bg-slate-700 dark:text-purple-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700',
            )}
          >
            Buscar Viaje
          </button>
          <button
            onClick={() => setActiveTab('offer')}
            className={clsx(
              'flex-1 py-4 text-center font-medium text-sm transition-colors',
              activeTab === 'offer' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600 dark:bg-slate-700 dark:text-purple-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700',
            )}
          >
            Ofrecer Viaje
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'find' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="¿Desde dónde sales?"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="relative sm:w-52">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    aria-label="Filtrar por fecha"
                    className="w-full pl-10 pr-9 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:[color-scheme:dark]"
                  />
                  {dateFilter ? (
                    <button
                      type="button"
                      onClick={() => setDateFilter('')}
                      aria-label="Quitar filtro de fecha"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={loadTrips}
                  className="bg-purple-600 text-white px-6 py-3 sm:py-0 rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Search size={20} />
                  <span className="sm:hidden">Buscar</span>
                </button>
              </div>

              {myActiveRide ? (
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <Info size={18} className="mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
                    <div className="text-sm text-purple-700 dark:text-purple-300">
                      <div className="flex items-center flex-wrap gap-2">
                        <p className="font-semibold text-purple-800 dark:text-purple-200">Ya tienes una solicitud de viaje activa</p>
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', RIDER_STATUS_BADGE_STYLES[myActiveRide.rider.status])}>
                          {RIDER_STATUS_LABELS[myActiveRide.rider.status] ?? myActiveRide.rider.status}
                        </span>
                      </div>
                      <p className="mt-0.5">
                        <strong>{myActiveRide.trip.origin} → {myActiveRide.trip.destination}</strong>
                        {' · '}
                        {formatTripDate(myActiveRide.trip.trip_date).date} a las {formatTripDate(myActiveRide.trip.trip_date).time}
                        {' · '}
                        conductor {myActiveRide.trip.driver?.full_name ?? 'sin nombre'}
                      </p>
                      <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                        {describeRideProgress(myActiveRide.trip, myActiveRide.rider.status)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    <button
                      type="button"
                      onClick={() => setShowActiveRideDetails(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Eye size={14} /> Ver más detalles
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelRide(myActiveRide.trip)}
                      disabled={actionTripId === myActiveRide.trip.trip_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    >
                      {actionTripId === myActiveRide.trip.trip_id ? <Loader2 size={14} className="animate-spin" /> : null}
                      Cancelar solicitud
                    </button>
                  </div>
                </div>
              ) : null}


              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Viajes Disponibles</h3>
                  <button
                    type="button"
                    onClick={() => setShowRideHistory(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <History size={14} /> Historial de mis viajes
                  </button>
                </div>

                {loadingTrips ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
                    <Loader2 size={18} className="animate-spin" /> Cargando viajes...
                  </div>
                ) : tripsError ? (
                  <p className="text-sm text-red-500 text-center py-6">{tripsError}</p>
                ) : visibleTrips.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    No hay viajes disponibles por ahora{searchQuery || dateFilter ? ' para esa búsqueda' : ''}.
                  </p>
                ) : (
                  visibleTrips.map((trip) => {
                    const { date, time } = formatTripDate(trip.trip_date);
                    const myRiderEntry = trip.tripRiders?.find((r) => r.user_id === currentUserId);
                    const hasActiveRequestHere =
                      !!myRiderEntry && ACTIVE_RIDER_STATUSES.includes(myRiderEntry.status);
                    const blockedByOtherActiveRide =
                      !!myActiveRide && myActiveRide.trip.trip_id !== trip.trip_id;
                    const noSeats = trip.seats_available <= 0 || trip.status === 'full';
                    const isBusy = actionTripId === trip.trip_id;

                    return (
                      <motion.div
                        key={trip.trip_id}
                        whileHover={{ scale: 1.005 }}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                              {initials(trip.driver?.full_name)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">{trip.driver?.full_name ?? 'Conductor'}</h4>
                              <div className="flex items-center text-sm text-slate-500 gap-2">
                                <span>{trip.origin}</span>
                                <span className="text-slate-300">→</span>
                                <span>{trip.destination}</span>
                              </div>
                              {trip.vehicle ? (
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Car size={12} /> {trip.vehicle.brand} {trip.vehicle.model} · {trip.vehicle.plate_number}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-sm">
                                <Clock size={14} /> {date} · {time}
                              </div>
                              <div
                                className={clsx(
                                  'text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1',
                                  noSeats
                                    ? 'text-red-600 bg-red-50 dark:bg-red-900/30'
                                    : 'text-green-600 bg-green-50 dark:bg-green-900/30',
                                )}
                              >
                                <Users size={12} /> {trip.seats_available}/{trip.seats_total} asientos
                              </div>
                            </div>

                            {hasActiveRequestHere ? (
                              <button
                                onClick={() => handleCancelRide(trip)}
                                disabled={isBusy}
                                className="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {isBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                                Cancelar solicitud
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRequestRide(trip)}
                                disabled={isBusy || noSeats || blockedByOtherActiveRide || trip.status !== 'open'}
                                title={blockedByOtherActiveRide ? 'Ya tienes una solicitud de viaje activa' : undefined}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {isBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                                {noSeats ? 'Sin asientos' : 'Solicitar'}
                              </button>
                            )}
                          </div>
                        </div>

                        {trip.meeting_point ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-sm">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 min-w-0">
                              <MapPin size={14} className="shrink-0" />
                              <span>
                                Punto de encuentro: <span className="text-slate-700 dark:text-slate-300">{trip.meeting_point}</span>
                                {' '}· hora aprox. {time}
                              </span>
                            </div>
                            <a
                              href={googleMapsSearchUrl(trip.meeting_point)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium shrink-0"
                            >
                              Ver en mapa <ExternalLink size={14} />
                            </a>
                          </div>
                        ) : null}

                        {trip.departure_time ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Clock size={14} className="shrink-0" />
                            <span>
                              Hora de salida estimada: <span className="text-slate-700 dark:text-slate-300">{formatTripDate(trip.departure_time).time}</span>
                            </span>
                          </div>
                        ) : null}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {offerView === 'publish' ? 'Publicar un nuevo viaje' : 'Mis viajes ofrecidos'}
                </h3>
                <button
                  type="button"
                  onClick={() => setOfferView(offerView === 'publish' ? 'myTrips' : 'publish')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {offerView === 'publish' ? (
                    <>
                      <ListChecks size={16} /> Mis viajes
                    </>
                  ) : (
                    <>
                      <PlusCircle size={16} /> Publicar viaje
                    </>
                  )}
                </button>
              </div>

              {offerView === 'publish' ? (
            <div className="max-w-xl mx-auto py-2">
              <form onSubmit={handlePublish} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vehículo</label>
                  {loadingVehicles ? (
                    <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando tus vehículos...</p>
                  ) : vehicles.length === 0 ? (
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                      No tienes vehículos registrados. Agrega uno antes de ofrecer un viaje.
                    </p>
                  ) : (
                    <select
                      value={selectedVehicleId ?? ''}
                      onChange={(e) => setSelectedVehicleId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    >
                      <option value="">Selecciona el vehículo con el que viajarás...</option>
                      {vehicles.map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.brand} {v.model} · {v.plate_number} ({v.seats_total} asientos)
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedVehicle ? (
                    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Car size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.color ? `· ${selectedVehicle.color}` : ''}
                        </p>
                        <p className="text-slate-500 text-xs">
                          Placas {selectedVehicle.plate_number} · {selectedVehicle.seats_total} asientos en total ·{' '}
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {Math.max(selectedVehicle.seats_total - 1, 0)} disponibles para pasajeros
                          </span>{' '}
                          (tú ocupas uno como conductor)
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Origen</label>
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      placeholder="Tu dirección..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destino</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      placeholder="Oficina central..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Punto de encuentro</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={meetingPoint}
                        onChange={(e) => setMeetingPoint(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                        placeholder="Ej. Entrada de Plaza Fiesta San Agustín"
                      />
                    </div>
                    {meetingPoint.trim() ? (
                      <a
                        href={googleMapsSearchUrl(meetingPoint.trim())}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-700 text-sm font-medium whitespace-nowrap"
                      >
                        Ver en mapa <ExternalLink size={14} />
                      </a>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Describe un lugar fácil de identificar para que tus pasajeros lo encuentren.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <CalendarDays size={14} /> Fecha del viaje
                    </label>
                    <input
                      type="date"
                      value={tripDate}
                      onChange={(e) => setTripDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Clock size={14} /> Hora aproximada en el punto de encuentro
                    </label>
                    <input
                      type="time"
                      value={tripTime}
                      onChange={(e) => setTripTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Flag size={14} /> Hora de salida (opcional)
                  </label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full md:w-1/2 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Es la hora en la que arrancará el recorrido (puede ser antes o después de la hora aproximada en el punto de encuentro, según tu ruta).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                    placeholder="Ej. Salgo puntual, favor de llegar 5 minutos antes..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={publishing || vehicles.length === 0}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                  Publicar Viaje
                </button>
              </form>
            </div>
              ) : (
                <div className="space-y-4">
                  {loadingMyTrips ? (
                    <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
                      <Loader2 size={18} className="animate-spin" /> Cargando tus viajes...
                    </div>
                  ) : myTripsError ? (
                    <p className="text-sm text-red-500 text-center py-6">{myTripsError}</p>
                  ) : myTrips.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Aún no has publicado ningún viaje. Usa "Publicar viaje" para ofrecer el primero.</p>
                  ) : (
                    myTrips.map((trip) => {
                      const { date, time } = formatTripDate(trip.trip_date);
                      const departure = trip.departure_time ? formatTripDate(trip.departure_time) : null;
                      const pendingRiders = (trip.tripRiders ?? []).filter((r) => r.status === 'requested');
                      const confirmedRiders = (trip.tripRiders ?? []).filter((r) =>
                        ['accepted', 'boarded', 'completed'].includes(r.status),
                      );
                      const isTripBusy = tripActionId === trip.trip_id;
                      const canStart = trip.status === 'open' || trip.status === 'full';
                      const canConfirmMeetingPoint =
                        trip.status === 'in_progress' && !trip.meeting_point_confirmed_at;
                      const canComplete =
                        trip.status === 'in_progress' && !!trip.meeting_point_confirmed_at;
                      const canCancel = trip.status !== 'completed' && trip.status !== 'cancelled';

                      return (
                        <motion.div
                          key={trip.trip_id}
                          whileHover={{ scale: 1.005 }}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4 hover:shadow-md transition-all"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center flex-wrap gap-2">
                                <h4 className="font-bold text-slate-900 dark:text-white">{trip.origin} → {trip.destination}</h4>
                                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', TRIP_STATUS_STYLES[trip.status])}>
                                  {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1"><CalendarDays size={14} /> {date} · {time}</span>
                                {departure ? (
                                  <span className="flex items-center gap-1"><Flag size={14} /> Salida aprox. {departure.time}</span>
                                ) : null}
                                <span className="flex items-center gap-1"><Users size={14} /> {trip.seats_available}/{trip.seats_total} asientos para pasajeros</span>
                                {trip.vehicle ? (
                                  <span className="flex items-center gap-1"><Car size={14} /> {trip.vehicle.brand} {trip.vehicle.model} · {trip.vehicle.plate_number}</span>
                                ) : null}
                              </div>
                              {trip.meeting_point ? (
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                  <MapPin size={14} className="shrink-0" />
                                  <span>Punto de encuentro: <span className="text-slate-700 dark:text-slate-300">{trip.meeting_point}</span></span>
                                  <a
                                    href={googleMapsSearchUrl(trip.meeting_point)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
                                  >
                                    Ver en mapa <ExternalLink size={12} />
                                  </a>
                                  {trip.meeting_point_confirmed_at ? (
                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                                      <CheckCircle2 size={12} /> Confirmado
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
                              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                {canStart ? (
                                  <button
                                    onClick={() => handleStartTrip(trip)}
                                    disabled={isTripBusy}
                                    title="Marca que ya saliste y vas en camino al punto de encuentro"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
                                  >
                                    {isTripBusy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                    Iniciar viaje
                                  </button>
                                ) : null}
                                {canConfirmMeetingPoint ? (
                                  <button
                                    onClick={() => handleConfirmMeetingPoint(trip)}
                                    disabled={isTripBusy}
                                    title="Presiona esto cuando ya hayas llegado al punto de encuentro y subido a tus pasajeros"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 transition-colors disabled:opacity-50"
                                  >
                                    {isTripBusy ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                                    Ya llegué al punto de encuentro
                                  </button>
                                ) : null}
                                {canComplete ? (
                                  <button
                                    onClick={() => handleCompleteTrip(trip)}
                                    disabled={isTripBusy}
                                    title="Presiona esto cuando ya hayan llegado al destino y el recorrido haya terminado"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    {isTripBusy ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
                                    Ya llegamos: finalizar viaje
                                  </button>
                                ) : null}
                                {canCancel ? (
                                  <button
                                    onClick={() => handleCancelTrip(trip)}
                                    disabled={isTripBusy}
                                    title="Cancela el viaje en cualquier momento. Se te pedirá indicar un motivo que verán tus pasajeros"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
                                  >
                                    {isTripBusy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                    Cancelar viaje
                                  </button>
                                ) : null}
                              </div>
                              {canConfirmMeetingPoint ? (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[260px] text-left md:text-right">
                                  Úsalo en cuanto recojas a tus pasajeros en el punto de encuentro; así sabrán que el viaje sigue su curso.
                                </p>
                              ) : null}
                              {canComplete ? (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[260px] text-left md:text-right">
                                  Úsalo al llegar al destino final; cerrará el viaje para ti y tus pasajeros.
                                </p>
                              ) : null}
                              {canCancel && trip.status !== 'open' && trip.status !== 'full' ? (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[260px] text-left md:text-right">
                                  Puedes cancelar incluso si el viaje ya inició; deberás indicar el motivo y tus pasajeros lo verán.
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {pendingRiders.length > 0 ? (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                Solicitudes pendientes ({pendingRiders.length})
                              </h5>
                              {pendingRiders.map((rider) => {
                                const riderKey = `${trip.trip_id}-${rider.user_id}`;
                                const isRiderBusy = riderActionKey === riderKey;
                                return (
                                  <div
                                    key={riderKey}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {initials(rider.user?.full_name)}
                                      </div>
                                      <span className="font-medium text-slate-700 dark:text-slate-300">{rider.user?.full_name ?? 'Pasajero'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleAcceptRider(trip, rider)}
                                        disabled={isRiderBusy}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 transition-colors disabled:opacity-50"
                                      >
                                        {isRiderBusy ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                                        Aceptar
                                      </button>
                                      <button
                                        onClick={() => handleRejectRider(trip, rider)}
                                        disabled={isRiderBusy}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
                                      >
                                        {isRiderBusy ? <Loader2 size={12} className="animate-spin" /> : <ThumbsDown size={12} />}
                                        Rechazar
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          {confirmedRiders.length > 0 ? (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                Pasajeros confirmados ({confirmedRiders.length})
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {confirmedRiders.map((rider) => (
                                  <span
                                    key={rider.user_id}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium"
                                  >
                                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-[10px] font-bold">
                                      {initials(rider.user?.full_name)}
                                    </span>
                                    {rider.user?.full_name ?? 'Pasajero'} · {RIDER_STATUS_LABELS[rider.status] ?? rider.status}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showActiveRideDetails && myActiveRide ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowActiveRideDetails(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Detalles de tu viaje</h3>
              <button
                type="button"
                onClick={() => setShowActiveRideDetails(false)}
                aria-label="Cerrar"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                  {initials(myActiveRide.trip.driver?.full_name)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{myActiveRide.trip.driver?.full_name ?? 'Conductor'}</p>
                  {myActiveRide.trip.driver?.email ? (
                    <p className="text-xs text-slate-500">{myActiveRide.trip.driver.email}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MapPin size={16} className="text-slate-400 shrink-0" />
                <span>{myActiveRide.trip.origin} <span className="text-slate-300">→</span> {myActiveRide.trip.destination}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CalendarDays size={16} className="text-slate-400 shrink-0" />
                <span>
                  {formatTripDate(myActiveRide.trip.trip_date).date} · {formatTripDate(myActiveRide.trip.trip_date).time}
                </span>
              </div>

              {myActiveRide.trip.meeting_point ? (
                <div className="flex flex-wrap items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 min-w-0">
                    <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>Punto de encuentro: <strong>{myActiveRide.trip.meeting_point}</strong></span>
                  </div>
                  <a
                    href={googleMapsSearchUrl(myActiveRide.trip.meeting_point)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium shrink-0 text-xs"
                  >
                    Ver en mapa <ExternalLink size={12} />
                  </a>
                </div>
              ) : null}

              {myActiveRide.trip.vehicle ? (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Car size={16} className="text-slate-400 shrink-0" />
                  <span>
                    {myActiveRide.trip.vehicle.brand} {myActiveRide.trip.vehicle.model}
                    {myActiveRide.trip.vehicle.color ? ` · ${myActiveRide.trip.vehicle.color}` : ''}
                    {' · '}placas {myActiveRide.trip.vehicle.plate_number}
                  </span>
                </div>
              ) : null}

              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Users size={16} className="text-slate-400 shrink-0" />
                <span>{myActiveRide.trip.seats_available}/{myActiveRide.trip.seats_total} asientos disponibles</span>
              </div>

              {myActiveRide.trip.status === 'cancelled' ? (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                  <XCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase mb-1">El conductor canceló este viaje</p>
                    <p className="text-sm">
                      {myActiveRide.trip.cancellation_reason
                        ? `Motivo: "${myActiveRide.trip.cancellation_reason}"`
                        : 'El conductor no especificó un motivo.'}
                    </p>
                  </div>
                </div>
              ) : null}

              {myActiveRide.trip.notes ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notas del conductor</p>
                  <p>{myActiveRide.trip.notes}</p>
                </div>
              ) : null}

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado de tu solicitud:</span>
                  <span className={clsx('text-xs font-medium px-2 py-1 rounded-full', RIDER_STATUS_BADGE_STYLES[myActiveRide.rider.status])}>
                    {RIDER_STATUS_LABELS[myActiveRide.rider.status] ?? myActiveRide.rider.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {describeRideProgress(myActiveRide.trip, myActiveRide.rider.status)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowActiveRideDetails(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => handleCancelRide(myActiveRide.trip)}
                disabled={actionTripId === myActiveRide.trip.trip_id}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
              >
                {actionTripId === myActiveRide.trip.trip_id ? <Loader2 size={14} className="animate-spin" /> : null}
                Cancelar solicitud
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {showRideHistory ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowRideHistory(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-lg w-full max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <History size={18} /> Historial de mis viajes
              </h3>
              <button
                type="button"
                onClick={() => setShowRideHistory(false)}
                aria-label="Cerrar"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {myRideHistory.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Todavía no tienes viajes pasados. Aquí verás tus solicitudes una vez que se completen, sean rechazadas o canceladas.
                </p>
              ) : (
                myRideHistory.map(({ trip, rider }) => {
                  const { date, time } = formatTripDate(trip.trip_date);
                  return (
                    <div
                      key={`${trip.trip_id}-${rider.user_id}`}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {trip.origin} <span className="text-slate-400">→</span> {trip.destination}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <CalendarDays size={12} /> {date} · {time}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', TRIP_STATUS_STYLES[trip.status])}>
                            {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                          </span>
                          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', RIDER_STATUS_BADGE_STYLES[rider.status])}>
                            {RIDER_STATUS_LABELS[rider.status] ?? rider.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Car size={12} className="shrink-0" />
                        <span>Conductor: {trip.driver?.full_name ?? 'sin nombre'}</span>
                      </div>

                      {trip.meeting_point ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin size={12} className="shrink-0" />
                          <span>Punto de encuentro: {trip.meeting_point}</span>
                        </div>
                      ) : null}

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {describeRideProgress(trip, rider.status)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowRideHistory(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
