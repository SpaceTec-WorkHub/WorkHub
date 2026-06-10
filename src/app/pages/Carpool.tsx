import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Clock,
  LoaderCircle,
  MapPin,
  Plus,
  Route,
  Search,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { getCurrentUserId, getStoredSession } from '../../services/auth';
import {
  CarpoolTrip,
  CarpoolTripIncidentType,
  CarpoolTripRider,
  CarpoolTripStatus,
  CarpoolUser,
  CarpoolVehicle,
  endCarpoolTrip,
  createCarpoolTrip,
  getCarpoolTrips,
  getCarpoolTripsByUser,
  getCarpoolUser,
  getCarpoolVehicles,
  joinCarpoolTrip,
  leaveCarpoolTrip,
  reportCarpoolTripIncident,
  requestCarpoolTripJoin,
  startCarpoolTrip,
  updateCarpoolTrip,
} from '../../services/carpool';

const ACCENTURE_SAN_PEDRO = 'Accenture San Pedro';
const ACCENTURE_LOCATION = {
  // cambiar ubicacion
  label: 'Accenture',
  latitude: 25.6516,
  longitude: -100.377,
};

type RouteDirection = 'ida' | 'regreso';
type RouteFilter = RouteDirection | 'all';

type MonterreyZone = {
  id: string;
  name: string;
  meetingPoint: string;
  latitude: number;
  longitude: number;
};

const MONTERREY_ZONES: MonterreyZone[] = [
  {
    id: 'valle-oriente',
    name: 'Valle Oriente',
    meetingPoint: 'Fashion Drive - Entrada principal',
    latitude: 25.651582,
    longitude: -100.339343,
  },
  {
    id: 'san-pedro-centro',
    name: 'San Pedro Centro',
    meetingPoint: 'Calzada del Valle y Calzada San Pedro - Palacio de Hierro',
    latitude: 25.654986,
    longitude: -100.366762,
  },
  {
    id: 'cumbres',
    name: 'Cumbres',
    meetingPoint: 'Puerta de Hierro - Paseo de los Leones',
    latitude: 25.724235394,
    longitude: -100.39630442585609,
  },
  {
    id: 'santa-catarina',
    name: 'Santa Catarina',
    meetingPoint: 'Parque La Huasteca - Entrada principal',
    latitude: 25.678075,
    longitude: -100.458046,
  },
  {
    id: 'guadalupe',
    name: 'Guadalupe',
    meetingPoint: 'HEB Linda Vista - Miguel Alemán',
    latitude: 25.661077739857163,
    longitude:  -100.20218652315066,
  },
  {
    id: 'apodaca',
    name: 'Apodaca',
    meetingPoint: 'Plaza Sendero Apodaca - Miguel Alemán',
    latitude: 25.781812,
    longitude: -100.188179,
  },
  {
    id: 'san-nicolas',
    name: 'San Nicolás',
    meetingPoint: 'Estación Universidad Metrorrey',
    latitude: 25.731457,
    longitude: -100.308824,
  },
  {
    id: 'escobedo',
    name: 'Escobedo',
    meetingPoint: 'Sendero Escobedo - Concordia',
    latitude: 25.797457,
    longitude: -100.317886,
  },
  {
    id: 'centro-monterrey',
    name: 'Centro de Monterrey',
    meetingPoint: 'Pabellón M - Entrada principal',
    latitude: 25.666468,
    longitude: -100.311024,
  },
  {
    id: 'valle-poniente',
    name: 'Valle Poniente',
    meetingPoint: 'UDEM - Entrada principal',
    latitude: 25.661660,
    longitude: -100.416013,

  },
];

type TripFormState = {
  trip_date: string;
  trip_time: string;
  route: RouteDirection;
  zone_id: string;
  notes: string;
  seats_total: string;
  vehicle_id: string;
};
/* */
const DEFAULT_FORM: TripFormState = {
  trip_date: new Date().toISOString().slice(0, 10),
  trip_time: '08:00',
  route: 'ida',
  zone_id: MONTERREY_ZONES[0]?.id ?? '',
  notes: '',
  seats_total: '3',
  vehicle_id: '',
};

function getInitials(value?: string | null) {
  const label = value?.trim() || 'U';
  const parts = label.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatTripDate(tripDate: string) {
  const parsed = new Date(tripDate);

  if (Number.isNaN(parsed.getTime())) {
    return tripDate;
  }

  return format(parsed, 'EEE d MMM, HH:mm');
}

function getTripStatusLabel(status: CarpoolTripStatus) {
  if (status === 'open') return 'Abierto';
  if (status === 'full') return 'Lleno';
  if (status === 'in_progress') return 'En curso';
  if (status === 'completed') return 'Completado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Borrador';
}

function getTripStatusClass(status: CarpoolTripStatus) {
  if (status === 'open') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (status === 'full') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (status === 'completed') return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (status === 'cancelled') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

function getRiderStatusLabel(status: CarpoolTripRider['status']) {
  if (status === 'requested') return 'Solicitud enviada';
  if (status === 'accepted') return 'Confirmado';
  if (status === 'rejected') return 'Rechazado';
  if (status === 'cancelled') return 'Cancelado';
  if (status === 'boarded') return 'A bordo';
  if (status === 'no_show') return 'No asistió';
  return 'Completado';
}

function getRiderStatusClass(status: CarpoolTripRider['status']) {
  if (status === 'requested') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (status === 'accepted' || status === 'boarded') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (status === 'rejected' || status === 'cancelled') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function buildTripDate(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  const result = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return result.toISOString();
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getTodayKey() {
  return format(new Date(), 'yyyy-MM-dd');
}

function getMinTimeForDate(dateKey: string) {
  const today = getTodayKey();
  if (dateKey !== today) return undefined;
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

function normalizeTripDateKey(tripDate: string) {
  const parsed = new Date(tripDate);
  if (Number.isNaN(parsed.getTime())) {
    return tripDate.slice(0, 10);
  }

  return format(parsed, 'yyyy-MM-dd');
}

function normalizeTripTimeKey(tripDate: string) {
  const parsed = new Date(tripDate);
  if (Number.isNaN(parsed.getTime())) {
    return tripDate.slice(11, 16);
  }

  return format(parsed, 'HH:mm');
}

function getZoneById(zoneId: string) {
  return MONTERREY_ZONES.find((zone) => zone.id === zoneId) ?? null;
}

function getZoneByTrip(trip: CarpoolTrip) {
  const origin = trip.origin.toLowerCase();
  const destination = trip.destination.toLowerCase();
  return MONTERREY_ZONES.find((zone) => origin.includes(zone.name.toLowerCase()) || destination.includes(zone.name.toLowerCase())) ?? null;
}

function getTripRoute(trip: CarpoolTrip): RouteDirection | null {
  const origin = trip.origin.toLowerCase();
  const destination = trip.destination.toLowerCase();
  const office = ACCENTURE_SAN_PEDRO.toLowerCase();

  if (origin.includes(office) && !destination.includes(office)) {
    return 'regreso';
  }

  if (destination.includes(office) && !origin.includes(office)) {
    return 'ida';
  }

  return null;
}

function getTripSlotKey(trip: CarpoolTrip) {
  const route = getTripRoute(trip);
  return `${route ?? 'unknown'}:${normalizeTripDateKey(trip.trip_date)}:${normalizeTripTimeKey(trip.trip_date)}`;
}

function getDisplayRouteLabel(route: RouteDirection) {
  return route === 'ida' ? `Ida a ${ACCENTURE_SAN_PEDRO}` : `Regreso desde ${ACCENTURE_SAN_PEDRO}`;
}

function getTripRouteLabel(trip: CarpoolTrip) {
  const route = getTripRoute(trip);
  if (route === 'ida') return 'Ida';
  if (route === 'regreso') return 'Regreso';
  return 'Ruta';
}

function getTripRouteClass(trip: CarpoolTrip) {
  const route = getTripRoute(trip);
  if (route === 'ida') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
  if (route === 'regreso') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

function getMapLink(zone: MonterreyZone, route: RouteDirection) {
  const location =
    route === 'ida'
      ? `${zone.latitude},${zone.longitude}`
      : `${zone.latitude},${zone.longitude}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function getMeetingPointText(zone: MonterreyZone, route: RouteDirection) {
  return route === 'ida'
    ? `${zone.meetingPoint} -> ${ACCENTURE_SAN_PEDRO}`
    : `${ACCENTURE_SAN_PEDRO} -> ${zone.meetingPoint}`;
}

function getFilterZoneTripLabel(zone: MonterreyZone, route: RouteDirection) {
  return route === 'ida' ? `Salida desde ${zone.name}` : `Regreso hacia ${zone.name}`;
}

function getTripDriverName(trip: CarpoolTrip) {
  return trip.driver?.full_name || trip.driver?.email || `Usuario #${trip.driver_id}`;
}

function getTripVehicleLabel(trip: CarpoolTrip) {
  if (!trip.vehicle) {
    return `Vehículo #${trip.vehicle_id}`;
  }

  return `${trip.vehicle.brand} ${trip.vehicle.model} · ${trip.vehicle.plate_number}`;
}

function getTripZone(trip: CarpoolTrip) {
  const origin = trip.origin.toLowerCase();
  const destination = trip.destination.toLowerCase();

  return MONTERREY_ZONES.find((zone) => origin.includes(zone.name.toLowerCase()) || destination.includes(zone.name.toLowerCase())) ?? null;
}

function getTripMeetingPointLocation(trip: CarpoolTrip) {
  const zone = getTripZone(trip);
  const route = getTripRoute(trip);

  if (!zone || !route) {
    return null;
  }

  return {
    latitude: zone.latitude,
    longitude: zone.longitude,
    label: zone.meetingPoint,
    zoneName: zone.name,
  };
}

function requestCurrentLocation() {
  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La geolocalización no está disponible en este navegador.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => reject(new Error('Se necesita tu ubicación para validar el viaje.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

function haversineMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const earthRadiusMeters = 6371000;
  const latitudeDelta = ((toLatitude - fromLatitude) * Math.PI) / 180;
  const longitudeDelta = ((toLongitude - fromLongitude) * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos((fromLatitude * Math.PI) / 180) *
      Math.cos((toLatitude * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceMeters(distance: number) {
  if (!Number.isFinite(distance)) {
    return 'N/D';
  }

  return `${Math.round(distance)} m`;
}

export default function Carpool() {
  const [currentUserId] = useState<number | null>(() => getCurrentUserId());
  const [currentUser, setCurrentUser] = useState<CarpoolUser | null>(null);
  const [vehicles, setVehicles] = useState<CarpoolVehicle[]>([]);
  const [availableTrips, setAvailableTrips] = useState<CarpoolTrip[]>([]);
  const [myTrips, setMyTrips] = useState<CarpoolTrip[]>([]);
  const [selectedTab, setSelectedTab] = useState<'discover' | 'offer' | 'mine'>('discover');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterRoute, setFilterRoute] = useState<RouteFilter>('all');
  const [filterZoneId, setFilterZoneId] = useState('all');
  const [form, setForm] = useState<TripFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [submittingTrip, setSubmittingTrip] = useState(false);
  const [actionTripId, setActionTripId] = useState<number | null>(null);
  const [selectedMineTripId, setSelectedMineTripId] = useState<number | null>(null);
  const [incidentType, setIncidentType] = useState<CarpoolTripIncidentType>('other');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const myVehicleOptions = useMemo(
    () => vehicles.filter((vehicle) => vehicle.is_active !== false),
    [vehicles],
  );

  const selectedFilterZone = useMemo(
    () => (filterZoneId === 'all' ? null : getZoneById(filterZoneId)),
    [filterZoneId],
  );

  const availableSlotKeys = useMemo(() => {
    const nextKeys = new Set<string>();

    for (const trip of myTrips) {
      const route = getTripRoute(trip);

      if (!route) {
        continue;
      }

      const status = trip.tripRiders?.find((rider) => rider.user_id === currentUserId)?.status;
      const isBlocked =
        trip.status === 'open' ||
        trip.status === 'full' ||
        trip.status === 'in_progress' ||
        trip.status === 'completed' ||
        status === 'requested' ||
        status === 'accepted' ||
        status === 'boarded';

      if (isBlocked) {
        nextKeys.add(getTripSlotKey(trip));
      }
    }

    return nextKeys;
  }, [currentUserId, myTrips]);

  const filteredTrips = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const now = Date.now();

    return availableTrips.filter((trip) => {
      // hide trips with a scheduled datetime in the past
      const tripTime = new Date(trip.trip_date).getTime();
      if (!Number.isNaN(tripTime) && tripTime < now) {
        return false;
      }
      if (trip.driver_id === currentUserId) {
        return false;
      }

      if (trip.status !== 'open' && trip.status !== 'full') {
        return false;
      }

      if (filterDate && normalizeTripDateKey(trip.trip_date) !== filterDate) {
        return false;
      }

      const tripRoute = getTripRoute(trip);

      if (filterRoute !== 'all' && tripRoute !== filterRoute) {
        return false;
      }

      if (selectedFilterZone && tripRoute) {
        const zoneName = selectedFilterZone.name.toLowerCase();
        const origin = trip.origin.toLowerCase();
        const destination = trip.destination.toLowerCase();

        if (tripRoute === 'ida' && !origin.includes(zoneName)) {
          return false;
        }

        if (tripRoute === 'regreso' && !destination.includes(zoneName)) {
          return false;
        }
      }

      if (selectedFilterZone && !tripRoute) {
        const zoneName = selectedFilterZone.name.toLowerCase();
        const origin = trip.origin.toLowerCase();
        const destination = trip.destination.toLowerCase();

        if (!origin.includes(zoneName) && !destination.includes(zoneName)) {
          return false;
        }
      }

      if (!search) {
        return true;
      }

      const haystack = [
        trip.origin,
        trip.destination,
        getTripDriverName(trip),
        trip.vehicle?.brand,
        trip.vehicle?.model,
        trip.vehicle?.plate_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [availableTrips, currentUserId, filterDate, filterRoute, searchTerm, selectedFilterZone]);

  const filteredRouteTripCount = useMemo(() => {
    if (filterRoute === 'all') {
      return filteredTrips.length;
    }

    return filteredTrips.filter((trip) => getTripRoute(trip) === filterRoute).length;
  }, [filterRoute, filteredTrips]);

  const driverTrips = useMemo(
    () => myTrips.filter((trip) => trip.driver_id === currentUserId),
    [currentUserId, myTrips],
  );

  const riderTrips = useMemo(
    () => myTrips.filter((trip) => trip.driver_id !== currentUserId),
    [currentUserId, myTrips],
  );

  const nearestMineTripId = useMemo(() => {
    const actionableTrips = myTrips.filter((trip) => trip.status !== 'cancelled' && trip.status !== 'completed');

    if (actionableTrips.length === 0) {
      return null;
    }

    const now = Date.now();

    return actionableTrips
      .slice()
      .sort((left, right) => {
        const leftDistance = Math.abs(new Date(left.trip_date).getTime() - now);
        const rightDistance = Math.abs(new Date(right.trip_date).getTime() - now);

        return leftDistance - rightDistance;
      })[0]?.trip_id ?? null;
  }, [myTrips]);

  const selectedMineTrip = useMemo(
    () => myTrips.find((trip) => trip.trip_id === selectedMineTripId) ?? null,
    [myTrips, selectedMineTripId],
  );

  useEffect(() => {
    if (selectedMineTripId && !myTrips.some((trip) => trip.trip_id === selectedMineTripId)) {
      setSelectedMineTripId(nearestMineTripId);
      return;
    }

    if (!selectedMineTripId && nearestMineTripId) {
      setSelectedMineTripId(nearestMineTripId);
    }
  }, [myTrips, nearestMineTripId, selectedMineTripId]);

  useEffect(() => {
    const loadCarpool = async () => {
      if (!currentUserId) {
        setErrorMessage('No se encontró la sesión activa.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        const [user, userVehicles, trips, userTrips] = await Promise.all([
          getCarpoolUser(currentUserId),
          getCarpoolVehicles(currentUserId),
          getCarpoolTrips(),
          getCarpoolTripsByUser(currentUserId),
        ]);

        setCurrentUser(user);
        setVehicles(Array.isArray(userVehicles) ? userVehicles : []);
        setAvailableTrips(Array.isArray(trips) ? trips : []);
        setMyTrips(Array.isArray(userTrips) ? userTrips : []);

        if (Array.isArray(userVehicles) && userVehicles.length > 0) {
          setForm((previous) => ({
            ...previous,
            vehicle_id: previous.vehicle_id || String(userVehicles[0].vehicle_id),
          }));
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No fue posible cargar Carpool.');
      } finally {
        setLoading(false);
      }
    };

    void loadCarpool();
  }, [currentUserId]);

  const refreshTrips = async () => {
    if (!currentUserId) {
      return;
    }

    const [trips, userTrips] = await Promise.all([
      getCarpoolTrips(),
      getCarpoolTripsByUser(currentUserId),
    ]);

    setAvailableTrips(Array.isArray(trips) ? trips : []);
    setMyTrips(Array.isArray(userTrips) ? userTrips : []);
  };

  const handleCreateTrip = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      return;
    }

    if (!form.vehicle_id) {
      setErrorMessage('Selecciona un vehículo activo.');
      return;
    }

    const selectedZone = getZoneById(form.zone_id);

    if (!selectedZone) {
      setErrorMessage('Selecciona una zona válida de Monterrey.');
      return;
    }

    const selectedVehicle = myVehicleOptions.find((vehicle) => vehicle.vehicle_id === Number(form.vehicle_id));

    if (!selectedVehicle) {
      setErrorMessage('El vehículo seleccionado no está disponible.');
      return;
    }

    const seatsTotal = Number(form.seats_total);

    if (!Number.isFinite(seatsTotal) || seatsTotal < 1) {
      setErrorMessage('Indica un número válido de asientos.');
      return;
    }

    if (seatsTotal > selectedVehicle.seats_total) {
      setErrorMessage('Los asientos no pueden superar la capacidad del vehículo.');
      return;
    }

    // validate trip date/time is in the future
    const candidateTripIso = buildTripDate(form.trip_date, form.trip_time);
    const candidateTripTime = new Date(candidateTripIso).getTime();
    if (Number.isNaN(candidateTripTime) || candidateTripTime < Date.now()) {
      setErrorMessage('La fecha y hora del viaje deben ser en el futuro. Ajusta la fecha/hora.');
      return;
    }

    const origin = form.route === 'ida' ? selectedZone.name : ACCENTURE_SAN_PEDRO;
    const destination = form.route === 'ida' ? ACCENTURE_SAN_PEDRO : selectedZone.name;

    const candidateSlotKey = `${form.route}:${form.trip_date}:${form.trip_time}`;

    if (availableSlotKeys.has(candidateSlotKey)) {
      setErrorMessage('Ya tienes un viaje solicitado o activo en esa misma fecha, hora y ruta.');
      return;
    }

    setSubmittingTrip(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createCarpoolTrip({
        trip_date: buildTripDate(form.trip_date, form.trip_time),
        seats_total: seatsTotal,
        vehicle_id: selectedVehicle.vehicle_id,
        origin,
        destination,
        notes: form.notes.trim() || undefined,
        driver_id: currentUserId,
        status: 'open',
      });

      setForm({
        ...DEFAULT_FORM,
        route: form.route,
        zone_id: form.zone_id,
        vehicle_id: String(selectedVehicle.vehicle_id),
      });
      setSuccessMessage('Tu viaje fue publicado correctamente.');
      await refreshTrips();
      setSelectedTab('discover');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible publicar el viaje.');
    } finally {
      setSubmittingTrip(false);
    }
  };

  const handleJoinTrip = async (trip: CarpoolTrip, requestOnly: boolean) => {
    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      return;
    }

    const tripRoute = getTripRoute(trip);
    const slotKey = getTripSlotKey(trip);

    if (availableSlotKeys.has(slotKey)) {
      setErrorMessage('Ya tienes un viaje solicitado o activo en esa misma fecha, hora y ruta.');
      return;
    }

    if (!tripRoute) {
      setErrorMessage('La ruta del viaje no es válida.');
      return;
    }

    setActionTripId(trip.trip_id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (requestOnly) {
        await requestCarpoolTripJoin(trip.trip_id, currentUserId);
        setSuccessMessage('Tu solicitud fue enviada.');
      } else {
        await joinCarpoolTrip(trip.trip_id, currentUserId);
        setSuccessMessage('Te uniste al viaje.');
      }

      await refreshTrips();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar tu participación.');
    } finally {
      setActionTripId(null);
    }
  };

  const handleLeaveTrip = async (trip: CarpoolTrip) => {
    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      return;
    }

    setActionTripId(trip.trip_id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await leaveCarpoolTrip(trip.trip_id, currentUserId);
      setSuccessMessage('Saliste del viaje.');
      await refreshTrips();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible salir del viaje.');
    } finally {
      setActionTripId(null);
    }
  };

  const handleCancelTrip = async (trip: CarpoolTrip) => {
    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      return;
    }

    if (trip.driver_id !== currentUserId) {
      setErrorMessage('Solo el dueño del viaje puede cancelarlo.');
      return;
    }

    setActionTripId(trip.trip_id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateCarpoolTrip(trip.trip_id, { status: 'cancelled' });
      setSuccessMessage('El viaje fue cancelado.');
      await refreshTrips();
      setSelectedMineTripId(trip.trip_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible cancelar el viaje.');
    } finally {
      setActionTripId(null);
    }
  };

  const handleRemoveTripRider = async (trip: CarpoolTrip, riderUserId: number) => {
    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      return;
    }

    if (trip.driver_id !== currentUserId) {
      setErrorMessage('Solo el dueño del viaje puede sacar participantes.');
      return;
    }

    setActionTripId(trip.trip_id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await leaveCarpoolTrip(trip.trip_id, riderUserId);
      setSuccessMessage('Participante removido del viaje.');
      await refreshTrips();
      setSelectedMineTripId(trip.trip_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible sacar al participante.');
    } finally {
      setActionTripId(null);
    }
  };

  const handleStartTrip = async (trip: CarpoolTrip) => {
    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      return;
    }

    if (trip.driver_id !== currentUserId) {
      setErrorMessage('Solo el conductor puede iniciar este viaje.');
      return;
    }

    const meetingPoint = getTripMeetingPointLocation(trip);

    if (!meetingPoint) {
      setErrorMessage('No hay un punto de encuentro configurado para este viaje.');
      return;
    }

    const tripDate = new Date(trip.trip_date).getTime();
    if (Math.abs(Date.now() - tripDate) > 5 * 60 * 1000) {
      setErrorMessage('El viaje solo puede iniciarse con una tolerancia de 5 minutos respecto a la hora programada.');
      return;
    }

    setActionTripId(trip.trip_id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const location = await requestCurrentLocation();
      const distance = haversineMeters(
        location.latitude,
        location.longitude,
        meetingPoint.latitude,
        meetingPoint.longitude,
      );

      if (distance > 800) {
        setErrorMessage(`Debes estar a menos de 800 metros del punto de encuentro. Distancia actual: ${formatDistanceMeters(distance)}.`);
        return;
      }

      await startCarpoolTrip(trip.trip_id, {
        user_id: currentUserId,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      setSuccessMessage('El viaje quedó iniciado.');
      await refreshTrips();
      setSelectedMineTripId(trip.trip_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible iniciar el viaje.');
    } finally {
      setActionTripId(null);
    }
  };

  const handleEndTrip = async (trip: CarpoolTrip) => {
    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      return;
    }

    if (trip.driver_id !== currentUserId) {
      setErrorMessage('Solo el conductor puede terminar este viaje.');
      return;
    }

    setActionTripId(trip.trip_id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const location = await requestCurrentLocation();

      await endCarpoolTrip(trip.trip_id, {
        user_id: currentUserId,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      setSuccessMessage('El viaje quedó finalizado.');
      await refreshTrips();
      setSelectedMineTripId(trip.trip_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible terminar el viaje.');
    } finally {
      setActionTripId(null);
    }
  };

  const handleReportTripIncident = async (trip: CarpoolTrip) => {
    if (!currentUserId) {
      setErrorMessage('No se encontró la sesión activa.');
      return;
    }

    if (!incidentDescription.trim()) {
      setErrorMessage('Escribe una descripción para reportar la incidencia.');
      return;
    }

    setActionTripId(trip.trip_id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const location = navigator.geolocation
        ? await requestCurrentLocation().catch(() => null)
        : null;

      await reportCarpoolTripIncident(trip.trip_id, {
        user_id: currentUserId,
        type: incidentType,
        description: incidentDescription.trim(),
        notes: incidentNotes.trim() || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      setSuccessMessage('La incidencia fue reportada.');
      setIncidentDescription('');
      setIncidentNotes('');
      setIncidentType('other');
      await refreshTrips();
      setSelectedMineTripId(trip.trip_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible reportar la incidencia.');
    } finally {
      setActionTripId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex items-center gap-3 text-slate-500">
          <LoaderCircle className="animate-spin" size={20} />
          Cargando Carpool...
        </div>
      </div>
    );
  }

  if (errorMessage && !currentUser) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        <h1 className="text-lg font-semibold">Carpool no disponible</h1>
        <p className="mt-2 text-sm">{errorMessage}</p>
      </div>
    );
  }

  const sessionUser = getStoredSession()?.user as { full_name?: string; email?: string } | undefined;
  const displayName = currentUser?.full_name || sessionUser?.full_name || currentUser?.email || sessionUser?.email || 'Usuario';
  const selectedOfferZone = getZoneById(form.zone_id) ?? MONTERREY_ZONES[0] ?? null;
  const selectedOfferMapLink = selectedOfferZone ? getMapLink(selectedOfferZone, form.route) : null;
  const selectedOfferMeetingPoint = selectedOfferZone ? getMeetingPointText(selectedOfferZone, form.route) : null;
  const selectedMineTripIsOwner = selectedMineTrip?.driver_id === currentUserId;
  const selectedMineTripRiderEntry = selectedMineTrip?.tripRiders?.find((rider) => rider.user_id === currentUserId) ?? null;
  const selectedMineTripConfirmedRiders = selectedMineTrip?.tripRiders?.filter((rider) => rider.status === 'accepted' || rider.status === 'boarded' || rider.status === 'completed') ?? [];

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-8 text-white shadow-2xl dark:border-slate-700"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.28),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur-sm">
              <Sparkles size={14} />
              
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Carpool</h1>
              <p className="mt-3 max-w-xl text-sm text-blue-100 sm:text-base">
                Crea una oferta, revisa viajes disponibles, solicita asiento y sigue el estado de tus trayectos desde una sola pantalla.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-blue-100">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Conductor: {displayName}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Vehículos activos: {myVehicleOptions.length}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Viajes disponibles: {filteredTrips.length}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px] lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-blue-100">Disponibles</p>
              <p className="mt-2 text-2xl font-bold">{filteredTrips.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-blue-100">Mis viajes</p>
              <p className="mt-2 text-2xl font-bold">{myTrips.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-blue-100">Asientos</p>
              <p className="mt-2 text-2xl font-bold">{myTrips.reduce((sum, trip) => sum + Math.max(trip.seats_available, 0), 0)}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSelectedTab('discover')}
            className={clsx(
              'flex-1 min-w-[180px] px-4 py-4 text-sm font-medium transition-colors',
              selectedTab === 'discover'
                ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700',
            )}
          >
            Buscar viaje
          </button>
          <button
            onClick={() => setSelectedTab('offer')}
            className={clsx(
              'flex-1 min-w-[180px] px-4 py-4 text-sm font-medium transition-colors',
              selectedTab === 'offer'
                ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700',
            )}
          >
            Ofrecer viaje
          </button>
          <button
            onClick={() => setSelectedTab('mine')}
            className={clsx(
              'flex-1 min-w-[180px] px-4 py-4 text-sm font-medium transition-colors',
              selectedTab === 'mine'
                ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700',
            )}
          >
            Mis viajes
          </button>
        </div>

        <div className="p-6 lg:p-8">
          {selectedTab === 'discover' ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr_0.8fr]">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Busca por origen, destino, conductor o vehículo"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(event) => setFilterDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <select
                  value={filterRoute}
                  onChange={(event) => setFilterRoute(event.target.value as RouteFilter)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="all">Todas las rutas</option>
                  <option value="ida">Ida</option>
                  <option value="regreso">Regreso</option>
                </select>
                <select
                  value={filterZoneId}
                  onChange={(event) => setFilterZoneId(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="all">Todas las zonas</option>
                  {MONTERREY_ZONES.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 lg:col-span-3">
                  {filteredRouteTripCount} viaje(s) encontrados
                  {filterRoute !== 'all' ? ` para ${getDisplayRouteLabel(filterRoute)}` : ''}
                  {selectedFilterZone ? ` en ${selectedFilterZone.name}` : ''}
                  {filterDate ? ` el ${filterDate}` : ''}
                </div>
              </div>

              {selectedFilterZone && filterRoute !== 'all' ? (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">Punto de encuentro sugerido</p>
                      <p className="mt-1">{getMeetingPointText(selectedFilterZone, filterRoute)}</p>
                      <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-200/80">Destino fijo: {ACCENTURE_SAN_PEDRO}</p>
                    </div>
                    <a
                      href={getMapLink(selectedFilterZone, filterRoute)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200"
                    >
                      Ver en mapa
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {filteredTrips.length > 0 ? (
                  filteredTrips.map((trip) => {
                    const riderEntry = trip.tripRiders?.find((rider) => rider.user_id === currentUserId) ?? null;
                    const canJoin = trip.status === 'open' && trip.seats_available > 0;
                    const slotKey = getTripSlotKey(trip);
                    const isSlotBlocked = availableSlotKeys.has(slotKey);
                    const routeLabel = getTripRouteLabel(trip);
                    const zone = getZoneByTrip(trip);

                    return (
                      <motion.div
                        key={trip.trip_id}
                        whileHover={{ y: -2 }}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                              {getInitials(getTripDriverName(trip))}
                            </div>
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{getTripDriverName(trip)}</h3>
                                <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', getTripStatusClass(trip.status))}>
                                  {getTripStatusLabel(trip.status)}
                                </span>
                                <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', getTripRouteClass(trip))}>
                                  {routeLabel}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Route size={14} />
                                  {trip.origin} → {trip.destination}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock size={14} />
                                  {formatTripDate(trip.trip_date)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Car size={14} />
                                  {getTripVehicleLabel(trip)}
                                </span>
                              </div>
                              {zone ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                  <span className="font-semibold">{getFilterZoneTripLabel(zone, getTripRoute(trip) ?? 'ida')}:</span> {getMeetingPointText(zone, getTripRoute(trip) ?? 'ida')}
                                </div>
                              ) : null}
                              {trip.notes ? <p className="max-w-2xl text-sm text-slate-500">{trip.notes}</p> : null}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 lg:min-w-[220px] lg:items-end">
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {trip.seats_available} de {trip.seats_total} asientos
                              </p>
                              <p className="text-xs text-slate-400">Capacidad del vehículo: {trip.vehicle?.seats_total ?? 'N/D'}</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {isSlotBlocked ? (
                                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                  Ya tienes una solicitud/viaje para esta fecha, hora y ruta
                                </span>
                              ) : null}
                              {canJoin ? (
                                <button
                                  onClick={() => handleJoinTrip(trip, false)}
                                  disabled={actionTripId === trip.trip_id || isSlotBlocked}
                                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                                >
                                  {actionTripId === trip.trip_id ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                  Unirme
                                </button>
                              ) : null}
                              <button
                                onClick={() => handleJoinTrip(trip, true)}
                                disabled={actionTripId === trip.trip_id || isSlotBlocked}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-slate-900"
                              >
                                {actionTripId === trip.trip_id ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                                Solicitar
                              </button>
                              {riderEntry ? (
                                <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', getRiderStatusClass(riderEntry.status))}>
                                  {getRiderStatusLabel(riderEntry.status)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No hay viajes disponibles con ese filtro.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedTab === 'offer' ? (
            <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
              <form onSubmit={handleCreateTrip} className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <Plus size={18} /> Publicar viaje
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ruta</span>
                    <select
                      value={form.route}
                      onChange={(event) => setForm((previous) => ({ ...previous, route: event.target.value as RouteDirection }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="ida">Ida a {ACCENTURE_SAN_PEDRO}</option>
                      <option value="regreso">Regreso desde {ACCENTURE_SAN_PEDRO}</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Zona</span>
                    <select
                      value={form.zone_id}
                      onChange={(event) => setForm((previous) => ({ ...previous, zone_id: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {MONTERREY_ZONES.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</span>
                    <input
                      type="date"
                      value={form.trip_date}
                      min={getTodayKey()}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((previous) => {
                          const next = { ...previous, trip_date: value };
                          const minTime = getMinTimeForDate(value);
                          if (minTime && next.trip_time < minTime) {
                            next.trip_time = minTime;
                          }
                          return next;
                        });
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hora</span>
                    <input
                      type="time"
                      value={form.trip_time}
                      min={getMinTimeForDate(form.trip_date)}
                      onChange={(event) => {
                        const value = event.target.value;
                        const minTime = getMinTimeForDate(form.trip_date);
                        if (minTime && value < minTime) {
                          setForm((previous) => ({ ...previous, trip_time: minTime }));
                          return;
                        }
                        setForm((previous) => ({ ...previous, trip_time: value }));
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Punto de encuentro</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {selectedOfferZone ? getMeetingPointText(selectedOfferZone, form.route) : 'Selecciona una zona para ver el punto de encuentro.'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Destino fijo: {form.route === 'ida' ? ACCENTURE_SAN_PEDRO : selectedOfferZone?.name ?? 'Zona seleccionada'}</p>
                    </div>
                    {selectedOfferMapLink ? (
                      <a
                        href={selectedOfferMapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        Ver mapa
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vehículo</span>
                    <select
                      value={form.vehicle_id}
                      onChange={(event) => setForm((previous) => ({ ...previous, vehicle_id: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Selecciona un vehículo</option>
                      {myVehicleOptions.map((vehicle) => (
                        <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                          {vehicle.brand} {vehicle.model} · {vehicle.plate_number} ({vehicle.seats_total} asientos)
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Asientos</span>
                    <input
                      type="number"
                      min={1}
                      max={myVehicleOptions.find((vehicle) => vehicle.vehicle_id === Number(form.vehicle_id))?.seats_total ?? undefined}
                      value={form.seats_total}
                      onChange={(event) => setForm((previous) => ({ ...previous, seats_total: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                </div>

                <label className="space-y-2 block">
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notas opcionales</span>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                    placeholder="Detalles adicionales de la ruta, horario flexible o indicaciones"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submittingTrip || myVehicleOptions.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingTrip ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  Publicar viaje
                </button>
              </form>

              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tus vehículos disponibles</h3>

                {myVehicleOptions.length > 0 ? (
                  <div className="space-y-3">
                    {myVehicleOptions.map((vehicle) => (
                      <div key={vehicle.vehicle_id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {vehicle.brand} {vehicle.model}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{vehicle.plate_number}</p>
                            {vehicle.color ? <p className="mt-1 text-xs text-slate-400">Color: {vehicle.color}</p> : null}
                          </div>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {vehicle.seats_total} asientos
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No tienes vehículos activos para publicar un viaje.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedTab === 'mine' ? (
            <div className="space-y-8">
              <AnimatePresence mode="wait">
                {selectedMineTrip ? (
                  <motion.section
                    key={selectedMineTrip.trip_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-xl dark:border-slate-700"
                  >
                    <div className="border-b border-white/10 bg-white/5 px-6 py-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold">Detalle del viaje</h3>
                        {selectedMineTrip.trip_id === nearestMineTripId ? (
                          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-100">Resaltado</span>
                        ) : null}
                        <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', getTripStatusClass(selectedMineTrip.status))}>
                          {getTripStatusLabel(selectedMineTrip.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">
                        Inicia con una tolerancia de 5 minutos y a menos de 800 metros del punto de encuentro.
                      </p>
                    </div>

                    <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-5">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
                              {getInitials(getTripDriverName(selectedMineTrip))}
                            </div>
                            <div>
                              <p className="text-lg font-semibold">{getTripDriverName(selectedMineTrip)}</p>
                              <p className="text-sm text-slate-300">{selectedMineTrip.origin} → {selectedMineTrip.destination}</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Horario</p>
                              <p className="mt-1 font-semibold">{formatTripDate(selectedMineTrip.trip_date)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Vehículo</p>
                              <p className="mt-1 font-semibold">{getTripVehicleLabel(selectedMineTrip)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Ruta</p>
                              <p className="mt-1 font-semibold">{getTripRouteLabel(selectedMineTrip)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Asientos</p>
                              <p className="mt-1 font-semibold">{selectedMineTrip.seats_available} / {selectedMineTrip.seats_total}</p>
                            </div>
                          </div>

                          {selectedMineTrip.notes ? <p className="mt-4 text-sm text-slate-200">{selectedMineTrip.notes}</p> : null}
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">Punto de encuentro</p>
                              <p className="mt-1 text-sm text-slate-300">
                                {getTripMeetingPointLocation(selectedMineTrip)?.label ?? 'Punto no configurado'}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">Geolocalización fija para validación de inicio.</p>
                            </div>
                            {selectedMineTrip && getTripZone(selectedMineTrip) ? (
                              <a
                                href={getMapLink(getTripZone(selectedMineTrip)!, getTripRoute(selectedMineTrip) ?? 'ida')}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                              >
                                Abrir Maps
                              </a>
                            ) : null}
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Modelo y placas</p>
                              <p className="mt-1 font-semibold">{selectedMineTrip.vehicle ? `${selectedMineTrip.vehicle.brand} ${selectedMineTrip.vehicle.model}` : 'Vehículo no disponible'}</p>
                              <p className="text-sm text-slate-300">{selectedMineTrip.vehicle?.plate_number ?? `Vehículo #${selectedMineTrip.vehicle_id}`}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-400">Regla operativa</p>
                              <p className="mt-1 text-sm text-slate-200">Puedes iniciar dentro de 5 minutos de tolerancia y con ubicación validada a 800 metros o menos de las oficinas de Accenture.</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
        
                            <span className="rounded-full border border-white/10 px-3 py-1">Tolerancia +/− 5 min</span>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                          <p className="text-sm font-semibold text-white">Quienes van</p>
                          <div className="mt-4 space-y-3">
                            {selectedMineTripConfirmedRiders.length > 0 ? (
                              selectedMineTripConfirmedRiders.map((rider) => (
                                <div key={`${rider.trip_id}-${rider.user_id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                                  <div>
                                    <p className="font-semibold text-white">{rider.user?.full_name || rider.user?.email || `Usuario #${rider.user_id}`}</p>
                                    <p className="text-xs text-slate-400">{rider.user?.email ?? 'Sin correo visible'}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', getRiderStatusClass(rider.status))}>
                                      {getRiderStatusLabel(rider.status)}
                                    </span>
                                    {selectedMineTripIsOwner && rider.user_id !== currentUserId ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleRemoveTripRider(selectedMineTrip, rider.user_id)}
                                        disabled={actionTripId === selectedMineTrip.trip_id}
                                        className="inline-flex items-center rounded-xl border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Sacar
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-300">Todavía no hay pasajeros confirmados.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                          <p className="text-sm font-semibold text-white">Acciones del viaje</p>
                          <div className="mt-4 space-y-3">
                            {selectedMineTripIsOwner && selectedMineTrip.status !== 'in_progress' && selectedMineTrip.status !== 'cancelled' && selectedMineTrip.status !== 'completed' ? (
                              <button
                                type="button"
                                onClick={() => void handleStartTrip(selectedMineTrip)}
                                disabled={actionTripId === selectedMineTrip.trip_id}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionTripId === selectedMineTrip.trip_id ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                Iniciar viaje
                              </button>
                            ) : null}

                            {selectedMineTripIsOwner && selectedMineTrip.status === 'in_progress' ? (
                              <button
                                type="button"
                                onClick={() => void handleEndTrip(selectedMineTrip)}
                                disabled={actionTripId === selectedMineTrip.trip_id}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionTripId === selectedMineTrip.trip_id ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                Terminar viaje
                              </button>
                            ) : null}

                            {!selectedMineTripIsOwner && selectedMineTripRiderEntry && selectedMineTripRiderEntry.status !== 'cancelled' && selectedMineTripRiderEntry.status !== 'completed' ? (
                              <button
                                type="button"
                                onClick={() => void handleLeaveTrip(selectedMineTrip)}
                                disabled={actionTripId === selectedMineTrip.trip_id}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionTripId === selectedMineTrip.trip_id ? <LoaderCircle size={18} className="animate-spin" /> : <XCircle size={18} />}
                                Salir del viaje
                              </button>
                            ) : null}

                            {selectedMineTripIsOwner && selectedMineTrip.status !== 'cancelled' && selectedMineTrip.status !== 'completed' ? (
                              <button
                                type="button"
                                onClick={() => void handleCancelTrip(selectedMineTrip)}
                                disabled={actionTripId === selectedMineTrip.trip_id}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionTripId === selectedMineTrip.trip_id ? <LoaderCircle size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                                Cancelar viaje
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => void handleReportTripIncident(selectedMineTrip)}
                              disabled={actionTripId === selectedMineTrip.trip_id}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white px-4 py-3 font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionTripId === selectedMineTrip.trip_id ? <LoaderCircle size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                              Reportar incidencia
                            </button>

                            <a
                              href="tel:911"
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                            >
                              <AlertCircle size={18} />
                              Llamar al 911
                            </a>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                          <p className="text-sm font-semibold text-white">Incidencia</p>
                          <div className="mt-4 space-y-3">
                            <select
                              value={incidentType}
                              onChange={(event) => setIncidentType(event.target.value as CarpoolTripIncidentType)}
                              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                              <option value="other">General</option>
                              <option value="safety">Seguridad</option>
                              <option value="vehicle_issue">Vehículo</option>
                              <option value="route_change">Cambio de ruta</option>
                              <option value="delay">Retraso</option>
                            </select>
                            <textarea
                              rows={4}
                              value={incidentDescription}
                              onChange={(event) => setIncidentDescription(event.target.value)}
                              placeholder="Describe lo que ocurrió"
                              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                            <textarea
                              rows={3}
                              value={incidentNotes}
                              onChange={(event) => setIncidentNotes(event.target.value)}
                              placeholder="Notas opcionales"
                              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                ) : null}
              </AnimatePresence>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Conduzco</h3>
                    <span className="text-xs uppercase tracking-wide text-slate-400">{driverTrips.length} viaje(s)</span>
                  </div>
                  <div className="space-y-3">
                    {driverTrips.length > 0 ? (
                      driverTrips.map((trip) => (
                        <button
                          key={trip.trip_id}
                          type="button"
                          onClick={() => setSelectedMineTripId(trip.trip_id)}
                          className={clsx(
                            'w-full rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800',
                            trip.trip_id === selectedMineTripId
                              ? 'border-blue-300 ring-2 ring-blue-500/30 dark:border-blue-600'
                              : 'border-slate-200 dark:border-slate-700',
                            trip.trip_id === nearestMineTripId ? 'shadow-sm' : '',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{trip.origin} → {trip.destination}</p>
                              <p className="mt-1 text-sm text-slate-500">{formatTripDate(trip.trip_date)} · {getTripVehicleLabel(trip)}</p>
                            </div>
                            <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', getTripStatusClass(trip.status))}>
                              {getTripStatusLabel(trip.status)}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                            <span>{trip.seats_available} asientos disponibles</span>
                            <span>{trip.tripRiders?.length ?? 0} participante(s)</span>
                          </div>
                          {trip.trip_id === nearestMineTripId ? (
                            <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                              Viaje más cercano
                            </div>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Todavía no has publicado viajes.
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Participo</h3>
                    <span className="text-xs uppercase tracking-wide text-slate-400">{riderTrips.length} viaje(s)</span>
                  </div>
                  <div className="space-y-3">
                    {riderTrips.length > 0 ? (
                      riderTrips.map((trip) => {
                        const riderEntry = trip.tripRiders?.find((rider) => rider.user_id === currentUserId) ?? null;

                        return (
                          <div
                            key={trip.trip_id}
                            onClick={() => setSelectedMineTripId(trip.trip_id)}
                            role="button"
                            tabIndex={0}
                            className={clsx(
                              'w-full rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800',
                              trip.trip_id === selectedMineTripId
                                ? 'border-blue-300 ring-2 ring-blue-500/30 dark:border-blue-600'
                                : 'border-slate-200 dark:border-slate-700',
                              trip.trip_id === nearestMineTripId ? 'shadow-sm' : '',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{trip.origin} → {trip.destination}</p>
                                <p className="mt-1 text-sm text-slate-500">Con {getTripDriverName(trip)} · {formatTripDate(trip.trip_date)}</p>
                              </div>
                              {riderEntry ? (
                                <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', getRiderStatusClass(riderEntry.status))}>
                                  {getRiderStatusLabel(riderEntry.status)}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                              <span>{trip.seats_available} asientos disponibles</span>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleLeaveTrip(trip);
                                }}
                                disabled={actionTripId === trip.trip_id}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:border-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                              >
                                {actionTripId === trip.trip_id ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
                                Salir
                              </button>
                            </div>
                            {trip.trip_id === nearestMineTripId ? (
                              <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                Viaje más cercano
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Aún no te has unido a ningún viaje.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <AlertCircle size={18} /> Estados básicos
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: 'Abierto', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                    { label: 'Lleno', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                    { label: 'Solicitud enviada', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
                    { label: 'Confirmado', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                    { label: 'Cancelado', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
                    { label: 'Completado', tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
                  ].map((item) => (
                    <span key={item.label} className={clsx('rounded-2xl px-4 py-3 text-sm font-semibold', item.tone)}>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
