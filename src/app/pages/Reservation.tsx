import React, { useEffect, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Calendar as CalendarIcon, Clock, CheckCircle, Search, Filter, MapPin, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import 'react-day-picker/dist/style.css';
import { getCurrentUserId } from '../../services/auth';
import {
  createReservation,
  getReservationSpaces,
  getReservationTimeSlots,
  getUserReservations,
  ReservationSpace,
  ReservationTimeSlot,
  ReservationRecord,
} from '../../services/reservation';

const css = `
  .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #2563eb; margin: 0; }
  .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #eff6ff; color: #2563eb; }
  .rdp-day_selected { background-color: #2563eb; color: white; }
`;

type SpaceTypeFilter = 'all' | string;

const buildLocalDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const isParkingSpace = (space: ReservationSpace | ReservationRecord['space']) =>
  (space.space_type?.name ?? '').toLowerCase().includes('parking');

const overlaps = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) =>
  leftStart < rightEnd && leftEnd > rightStart;

export default function Reservation() {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<ReservationTimeSlot | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [timeSlots, setTimeSlots] = useState<ReservationTimeSlot[]>([]);
  const [spaces, setSpaces] = useState<ReservationSpace[]>([]);
  const [userReservations, setUserReservations] = useState<ReservationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<SpaceTypeFilter>('all');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const today = useMemo(() => startOfToday(), []);
  const selectedDateKey = date ? format(date, 'yyyy-MM-dd') : '';
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const availableTypes = useMemo(() => {
    const types = spaces
      .map((space) => space.space_type?.name ?? 'Espacio')
      .filter((type, index, collection) => collection.indexOf(type) === index);

    return ['all', ...types];
  }, [spaces]);

  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      const spaceType = space.space_type?.name ?? 'Espacio';
      const matchesType = selectedType === 'all' || spaceType === selectedType;
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        `${space.code} ${spaceType} ${space.zone?.name ?? ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [searchTerm, selectedType, spaces]);

  const selectedSpace = spaces.find((space) => space.space_id === selectedSpaceId) ?? null;

  const parkingConflictExists = useMemo(() => {
    if (!date || !selectedSlot) {
      return false;
    }

    const slotStart = buildLocalDateTime(date, selectedSlot.start_time);
    const slotEnd = buildLocalDateTime(date, selectedSlot.end_time);

    return userReservations.some((reservation) => {
      if (!isParkingSpace(reservation.space)) {
        return false;
      }

      const reservationStart = new Date(reservation.start_time);
      const reservationEnd = new Date(reservation.end_time);
      return overlaps(slotStart, slotEnd, reservationStart, reservationEnd);
    });
  }, [date, selectedSlot, userReservations]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    setLoadingReservations(true);
    getUserReservations(currentUserId)
      .then((data) => setUserReservations(data))
      .catch(() => setUserReservations([]))
      .finally(() => setLoadingReservations(false));
  }, [currentUserId]);

  useEffect(() => {
    if (!date) {
      setTimeSlots([]);
      setSpaces([]);
      setSelectedSlot(null);
      setSelectedSpaceId(null);
      return;
    }

    if (isBefore(date, today)) {
      setTimeSlots([]);
      setSpaces([]);
      setSelectedSlot(null);
      setSelectedSpaceId(null);
      return;
    }

    setLoadingSlots(true);
    setErrorMessage('');

    getReservationTimeSlots(selectedDateKey)
      .then((slots) => {
        setTimeSlots(slots);
        const firstAvailableSlot = slots.find((slot) => slot.is_available);

        if (!firstAvailableSlot) {
          setSelectedSlot(null);
          setSelectedSpaceId(null);
          setSpaces([]);
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'No fue posible cargar los horarios.');
        setTimeSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [date, selectedDateKey, today]);

  useEffect(() => {
    if (!date || !selectedSlot) {
      setSpaces([]);
      setSelectedSpaceId(null);
      return;
    }

    setLoadingSpaces(true);
    setErrorMessage('');

    getReservationSpaces(selectedDateKey, selectedSlot.start_time, selectedSlot.end_time)
      .then((availableSpaces) => {
        const filteredSpaces = parkingConflictExists
          ? availableSpaces.filter((space) => !isParkingSpace(space))
          : availableSpaces;

        setSpaces(filteredSpaces);
        setSelectedSpaceId((currentSelectedSpaceId) => {
          if (filteredSpaces.some((space) => space.space_id === currentSelectedSpaceId)) {
            return currentSelectedSpaceId;
          }

          return null;
        });
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'No fue posible cargar los espacios disponibles.');
        setSpaces([]);
        setSelectedSpaceId(null);
      })
      .finally(() => {
        setLoadingSpaces(false);
      });
  }, [date, selectedDateKey, selectedSlot, parkingConflictExists]);

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setSelectedSlot(null);
    setSelectedSpaceId(null);
    setSpaces([]);
    setSuccessMessage('');
  };

  const handleTimeSelect = (slot: ReservationTimeSlot) => {
    if (!slot.is_available) {
      return;
    }

    setSelectedSlot(slot);
    setSelectedSpaceId(null);
    setSuccessMessage('');
  };

  const handleConfirm = async () => {
    if (!date || !selectedSlot || !selectedSpaceId) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createReservation({
        start_time: buildLocalDateTime(date, selectedSlot.start_time).toISOString(),
        end_time: buildLocalDateTime(date, selectedSlot.end_time).toISOString(),
        space_id: selectedSpaceId,
      });

      setSuccessMessage('Reserva confirmada exitosamente.');
      if (currentUserId) {
        const refreshedReservations = await getUserReservations(currentUserId);
        setUserReservations(refreshedReservations);
      }
      const refreshedSlots = await getReservationTimeSlots(selectedDateKey);
      setTimeSlots(refreshedSlots);
      setSelectedSlot(null);
      setSelectedSpaceId(null);
      setSpaces([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible confirmar la reserva.');
    }
  };

  const canShowConfirmBar = Boolean(date && selectedSlot && selectedSpaceId);
  const todaySlots = timeSlots.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <style>{css}</style>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nueva Reserva</h1>
        <p className="text-slate-500">
          Selecciona una fecha futura o de hoy, luego el horario y el espacio disponible.
        </p>
          <button
            onClick={() => navigate('/reservations')}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver historial de reservas
          </button>
      </div>

      {parkingConflictExists ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Ya tienes una reserva de estacionamiento en este horario. Solo se muestran espacios no vehiculares.
        </div>
      ) : null}

      {loadingReservations ? (
        <div className="mb-6 text-sm text-slate-500">Cargando historial del usuario...</div>
      ) : null}

      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CalendarIcon size={18} /> Fecha
            </h3>
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                locale={es}
                disabled={{ before: today }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock size={18} /> Horario
            </h3>
            {loadingSlots ? (
              <div className="text-sm text-slate-500">Cargando horarios disponibles...</div>
            ) : todaySlots ? (
              <div className="grid grid-cols-1 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.label}
                    onClick={() => handleTimeSelect(slot)}
                    disabled={!slot.is_available}
                    className={clsx(
                      'text-xs py-2 px-3 rounded-md border transition-all text-left flex items-center justify-between gap-3',
                      selectedSlot?.label === slot.label
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : slot.is_available
                          ? 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent hover:bg-blue-50 hover:text-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent cursor-not-allowed opacity-60',
                    )}
                  >
                    <span>{slot.label}</span>
                    <span className="text-[11px] uppercase tracking-wide">
                      {slot.is_available ? `${slot.available_space_count} libres` : 'Sin cupo'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                No hay horarios disponibles para esta fecha.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar espacio o zona..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
                  )}
                >
                  <Filter size={16} />
                  {type === 'all' ? 'Todos' : type}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              {date ? format(date, 'PPP', { locale: es }) : 'Sin fecha seleccionada'}
              {selectedSlot ? ` • ${selectedSlot.label}` : ''}
            </span>
            <span>{filteredSpaces.length} espacio(s) disponible(s)</span>
          </div>

          {loadingSpaces ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-sm text-slate-500">
              Cargando espacios disponibles...
            </div>
          ) : filteredSpaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSpaces.map((space) => {
                const isSelected = selectedSpaceId === space.space_id;
                const spaceType = space.space_type?.name ?? 'Espacio';

                return (
                  <motion.div
                    key={space.space_id}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedSpaceId(space.space_id)}
                    className={clsx(
                      'cursor-pointer p-6 rounded-xl border-2 transition-all shadow-sm flex flex-col justify-between min-h-48',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md ring-1 ring-blue-500'
                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-200 dark:hover:border-blue-800',
                    )}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
                          {spaceType}
                        </span>
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{space.code}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Zona: {space.zone?.name ?? 'Sin zona'}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {space.is_accessible ? (
                          <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">Accesible</span>
                        ) : null}
                        {space.is_priority ? (
                          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Prioritario</span>
                        ) : null}
                      </div>
                      {isSelected ? (
                        <motion.div layoutId="check" className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                          <CheckCircle size={16} /> Seleccionado
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin size={16} /> Disponible para este horario
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
              <Sparkles className="mx-auto mb-3 text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">No hay espacios disponibles</h3>
              <p className="text-sm text-slate-500">
                Prueba con otro horario o fecha para encontrar espacios libres.
              </p>
            </div>
          )}

          <div className="fixed bottom-6 right-6 lg:right-10 lg:left-72 z-40">
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: canShowConfirmBar ? 0 : 100 }}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-xl shadow-xl flex items-center justify-between max-w-2xl mx-auto w-full gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="bg-slate-800 dark:bg-slate-200 p-2 rounded-lg">
                  <CalendarIcon size={24} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm">Confirmar Reserva</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {date ? format(date, "PPP", { locale: es }) : ''} • {selectedSlot?.label}
                    {selectedSpace ? ` • ${selectedSpace.code}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleConfirm}
                disabled={!canShowConfirmBar}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all"
              >
                Confirmar
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
