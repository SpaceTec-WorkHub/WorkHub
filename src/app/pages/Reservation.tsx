import React, { useEffect, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isBefore, isToday, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router';
import { Calendar as CalendarIcon, Clock, Filter, MapPin, Search, Sparkles, CalendarClock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import 'react-day-picker/dist/style.css';
import { getCurrentUserId } from '../../services/auth';
import { ApiSpace, getSpace } from '../../services/space';
import {
  createReservation,
  getReservationSpaces,
  getReservationTimeSlots,
  getUserReservations,
  ReservationRecord,
  ReservationSpace,
  ReservationTimeSlot,
} from '../../services/reservation';

const css = `
  .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #2563eb; margin: 0; }
  .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #eff6ff; color: #2563eb; }
  .rdp-day_selected { background-color: #2563eb; color: white; }
`;

type SpaceTypeFilter = 'all' | 'desk' | 'meeting' | 'parking';

const buildLocalDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const isParkingSpace = (space: { space_type?: { name?: string } | null | undefined }) =>
  (space.space_type?.name ?? '').toLowerCase().includes('parking');

const isDeskSpace = (space: { space_type?: { name?: string } | null | undefined }) => {
  const name = (space.space_type?.name ?? '').toLowerCase();
  return name.includes('desk') || name.includes('escritorio') || name.includes('escritorios');
};

const isRoomSpace = (space: { space_type?: { name?: string } | null | undefined }) => {
  const name = (space.space_type?.name ?? '').toLowerCase();
  return name.includes('room') || name.includes('sala') || name.includes('meeting') || name.includes('juntas');
};

const overlaps = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) =>
  leftStart < rightEnd && leftEnd > rightStart;

const getReservationEffectiveEnd = (reservation: ReservationRecord) =>
  reservation.status === 'checked_out' && reservation.check_out_time
    ? new Date(reservation.check_out_time)
    : new Date(reservation.end_time);

const isTimeSlotPassed = (slot: ReservationTimeSlot, selectedDate: Date): boolean => {
  if (!isToday(selectedDate)) {
    return false;
  }

  const now = new Date();
  const [slotEndHours, slotEndMinutes] = slot.end_time.split(':').map(Number);
  const slotEndTime = new Date(selectedDate);
  slotEndTime.setHours(slotEndHours, slotEndMinutes, 0, 0);

  return now >= slotEndTime;
};

const getSpaceTypeLabel = (type: SpaceTypeFilter) => {
  if (type === 'desk') return 'Desk';
  if (type === 'meeting') return 'Meeting Room';
  if (type === 'parking') return 'Parking';
  return 'espacios';
};

const getActiveReservationStatuses = () => new Set<ReservationRecord['status']>(['reserved', 'checked_in', 'checkout_pending', 'incident']);

const getSpaceStatusLabel = (status: ReservationSpace['status']) => {
  if (status === 'available') return 'Libre';
  if (status === 'occupied') return 'Ocupado';
  if (status === 'maintenance') return 'Mantenimiento';
  return 'Bloqueado';
};

const getSpaceKindLabel = (kind: SpaceTypeFilter | 'other') => {
  if (kind === 'desk') return 'Desk';
  if (kind === 'meeting') return 'Meeting Room';
  if (kind === 'parking') return 'Parking';
  return 'Espacio';
};

const getSpaceKindFromSpace = (space: { space_type?: { name?: string } | null }): SpaceTypeFilter | 'other' => {
  if (isDeskSpace(space)) return 'desk';
  if (isRoomSpace(space)) return 'meeting';
  if (isParkingSpace(space)) return 'parking';
  return 'other';
};

const getEffectiveSpaceStatus = (space: { space_id: number; status: ReservationSpace['status'] }, availableSpaceIds: Set<number>): ReservationSpace['status'] => {
  if (space.status !== 'available') {
    return space.status;
  }

  return availableSpaceIds.has(space.space_id) ? 'available' : 'occupied';
};

const getSpaceCardClass = (status: ReservationSpace['status']) => {
  if (status === 'available') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 hover:-translate-y-0.5 hover:shadow-md shadow-sm cursor-pointer';
  }

  if (status === 'occupied') {
    return 'border-red-200 bg-red-50 text-red-700 opacity-85 cursor-not-allowed';
  }

  if (status === 'maintenance') {
    return 'border-amber-200 bg-amber-50 text-amber-700 opacity-85 cursor-not-allowed';
  }

  return 'border-slate-200 bg-slate-100 text-slate-500 opacity-80 cursor-not-allowed';
};

function getReservationContext(search: string, state: unknown) {
  const searchParams = new URLSearchParams(search);
  const navigationState = state && typeof state === 'object' ? (state as Record<string, unknown>) : {};

  const readPositiveNumber = (...values: unknown[]) => {
    for (const value of values) {
      const parsedValue = Number(value);
      if (Number.isFinite(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
    }

    return null;
  };

  const readString = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return null;
  };

  return {
    eventId: readPositiveNumber(navigationState.eventId, navigationState.event_id, searchParams.get('event_id')),
    date: readString(navigationState.date, navigationState.selectedDate, searchParams.get('date')),
    startTime: readString(navigationState.startTime, navigationState.start_time, searchParams.get('start_time')),
    endTime: readString(navigationState.endTime, navigationState.end_time, searchParams.get('end_time')),
    spaceId: readPositiveNumber(
      navigationState.spaceId,
      navigationState.space_id,
      navigationState.selectedSpaceId,
      searchParams.get('space_id'),
    ),
    spaceCode: readString(navigationState.spaceCode, navigationState.code, navigationState.selectedSpaceCode),
  };
}

function normalizeToHHMM(value?: string | null | Date) {
  if (!value) return null;
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const match = raw.match(/(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function parseLocalDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export default function Reservation() {
  const navigate = useNavigate();
  const location = useLocation();
  const reservationContext = useMemo(
    () => getReservationContext(location.search, location.state),
    [location.search, location.state],
  );
  const summaryMode = Boolean(reservationContext.spaceId);

  const [date, setDate] = useState<Date | undefined>(() => {
    if (reservationContext.date) {
      const parsedDate = parseLocalDateOnly(reservationContext.date);
      if (parsedDate) {
        return parsedDate;
      }
    }

    if (reservationContext.startTime) {
      const parsed = new Date(String(reservationContext.startTime));
      if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }

    return new Date();
  });
  const [selectedSlot, setSelectedSlot] = useState<ReservationTimeSlot | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [timeSlots, setTimeSlots] = useState<ReservationTimeSlot[]>([]);
  const [spaces, setSpaces] = useState<ReservationSpace[]>([]);
  const [allSpaces, setAllSpaces] = useState<ApiSpace[]>([]);
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
  const selectedSpace = spaces.find((space) => space.space_id === selectedSpaceId) ?? null;
  const activeReservationStatuses = useMemo(() => getActiveReservationStatuses(), []);
  const availableSpaceIds = useMemo(() => new Set(spaces.map((space) => space.space_id)), [spaces]);

  useEffect(() => {
    let mounted = true;

    getSpace()
      .then((data) => {
        if (mounted) {
          setAllSpaces(data ?? []);
        }
      })
      .catch(() => {
        if (mounted) {
          setAllSpaces([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const typeFilters = useMemo(
    () => [
      { id: 'all' as const, label: 'Todos' },
      { id: 'desk' as const, label: 'Desk' },
      { id: 'meeting' as const, label: 'Meeting Room' },
      { id: 'parking' as const, label: 'Parking' },
    ],
    [],
  );

  const validTimeSlots = useMemo(
    () =>
      timeSlots.map((slot) => ({
        ...slot,
        is_available: slot.is_available && !isTimeSlotPassed(slot, date ?? new Date()),
      })),
    [timeSlots, date],
  );

  const parkingConflictExists = useMemo(() => {
    if (!date || !selectedSlot) {
      return false;
    }

    const slotStart = buildLocalDateTime(date, selectedSlot.start_time);
    const slotEnd = buildLocalDateTime(date, selectedSlot.end_time);

    const conflicts = userReservations.filter((reservation) => {
      if (!activeReservationStatuses.has(reservation.status)) return false;
      if (!isParkingSpace(reservation.space)) return false;
      return overlaps(slotStart, slotEnd, new Date(reservation.start_time), getReservationEffectiveEnd(reservation));
    });

    return conflicts.length > 0;
  }, [activeReservationStatuses, date, selectedSlot, userReservations]);

  const deskConflictExists = useMemo(() => {
    if (!date || !selectedSlot) return false;

    const slotStart = buildLocalDateTime(date, selectedSlot.start_time);
    const slotEnd = buildLocalDateTime(date, selectedSlot.end_time);

    const conflicts = userReservations.filter((reservation) => {
      if (!activeReservationStatuses.has(reservation.status)) return false;
      if (!isDeskSpace(reservation.space)) return false;
      return overlaps(slotStart, slotEnd, new Date(reservation.start_time), getReservationEffectiveEnd(reservation));
    });

    return conflicts.length > 0;
  }, [activeReservationStatuses, date, selectedSlot, userReservations]);

  const roomConflictExists = useMemo(() => {
    if (!date || !selectedSlot) return false;

    const slotStart = buildLocalDateTime(date, selectedSlot.start_time);
    const slotEnd = buildLocalDateTime(date, selectedSlot.end_time);

    const conflicts = userReservations.filter((reservation) => {
      if (!activeReservationStatuses.has(reservation.status)) return false;
      if (!isRoomSpace(reservation.space)) return false;
      return overlaps(slotStart, slotEnd, new Date(reservation.start_time), getReservationEffectiveEnd(reservation));
    });

    return conflicts.length > 0;
  }, [activeReservationStatuses, date, selectedSlot, userReservations]);

  const selectedSlotReservations = useMemo(() => {
    if (!date || !selectedSlot) {
      return [];
    }

    const slotStart = buildLocalDateTime(date, selectedSlot.start_time);
    const slotEnd = buildLocalDateTime(date, selectedSlot.end_time);

    const result = userReservations.filter((reservation) => {
      if (!activeReservationStatuses.has(reservation.status)) {
        return false;
      }

      return overlaps(slotStart, slotEnd, new Date(reservation.start_time), getReservationEffectiveEnd(reservation));
    });

    return result;
  }, [activeReservationStatuses, date, selectedSlot, userReservations]);

  const selectedSlotTypeReservations = useMemo(() => {
    return selectedSlotReservations.filter((reservation) => {
      if (selectedType === 'desk') return isDeskSpace(reservation.space);
      if (selectedType === 'meeting') return isRoomSpace(reservation.space);
      if (selectedType === 'parking') return isParkingSpace(reservation.space);
      return true;
    });
  }, [selectedSlotReservations, selectedType]);

  const blockedTypes = useMemo(() => {
    const types: string[] = [];

    if (parkingConflictExists) {
      types.push('Parking');
    }
    if (deskConflictExists) {
      types.push('Desk');
    }
    if (roomConflictExists) {
      types.push('Meeting Room');
    }

    return types;
  }, [deskConflictExists, parkingConflictExists, roomConflictExists]);

  const reservationBlockMessage = useMemo(() => {
    if (!date || !selectedSlot) {
      return '';
    }

    if (blockedTypes.length === 0) {
      return '';
    }

    if (blockedTypes.length === 1) {
      return `Ya tienes una reserva de ${blockedTypes[0].toLowerCase()} en este horario, por eso no aparecen más espacios de ese tipo.`;
    }

    return `Ya tienes reservas activas en este horario para ${blockedTypes.slice(0, -1).join(', ')} y ${blockedTypes[blockedTypes.length - 1].toLowerCase()}, por eso se ocultan esos espacios.`;
  }, [blockedTypes, date, selectedSlot]);

  const hiddenSpaceKinds = useMemo(() => {
    const kinds = new Set<SpaceTypeFilter | 'other'>();

    for (const reservation of selectedSlotReservations) {
      kinds.add(getSpaceKindFromSpace(reservation.space));
    }

    return kinds;
  }, [selectedSlotReservations]);

  const hiddenReservationDetails = useMemo(() => {
    if (!date || !selectedSlot) {
      return [];
    }

    return selectedSlotReservations
      .filter((reservation) => hiddenSpaceKinds.has(getSpaceKindFromSpace(reservation.space)))
      .map((reservation) => ({
        reservationId: reservation.reservation_id,
        code: reservation.space.code,
        zone: reservation.space.zone?.name ?? 'Sin zona',
        type: getSpaceKindLabel(getSpaceKindFromSpace(reservation.space)),
      }));
  }, [date, hiddenSpaceKinds, selectedSlot, selectedSlotReservations]);

  const visibleSpaces = useMemo(() => {
    return allSpaces.filter((space) => {
      const matchesType =
        selectedType === 'all' ||
        (selectedType === 'desk' && isDeskSpace(space)) ||
        (selectedType === 'meeting' && isRoomSpace(space)) ||
        (selectedType === 'parking' && isParkingSpace(space));
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        `${space.code} ${(space.space_type?.name ?? 'Espacio')} ${space.zone?.name ?? ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      if (!matchesType || !matchesSearch) {
        return false;
      }

      return !hiddenSpaceKinds.has(getSpaceKindFromSpace(space));
    });
  }, [allSpaces, hiddenSpaceKinds, searchTerm, selectedType]);

  const visibleSpaceStats = useMemo(() => {
    return visibleSpaces.reduce(
      (stats, space) => {
        const effectiveStatus = getEffectiveSpaceStatus(space, availableSpaceIds);
        stats[effectiveStatus] += 1;
        return stats;
      },
      { available: 0, occupied: 0, maintenance: 0, blocked: 0 },
    );
  }, [availableSpaceIds, visibleSpaces]);

  useEffect(() => {
    if (!currentUserId) {
      navigate('/login', { replace: true });
      return;
    }

    if (summaryMode) {
      return;
    }

    setLoadingReservations(true);
    getUserReservations(currentUserId)
      .then((data) => {
        const onlyMine = data.filter((res) => Number(res.user_id) === Number(currentUserId));

        const activeOnly = onlyMine.filter((res) =>
          ['reserved', 'checked_in', 'checkout_pending', 'incident'].includes(res.status),
        );

        setUserReservations(activeOnly);
      })
      .catch(() => setUserReservations([]))
      .finally(() => setLoadingReservations(false));
  }, [currentUserId, navigate, summaryMode]);

  useEffect(() => {
    if (summaryMode) {
      return;
    }

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
        if (reservationContext.startTime && reservationContext.endTime) {
          const targetStart = normalizeToHHMM(reservationContext.startTime);
          const targetEnd = normalizeToHHMM(reservationContext.endTime);
          const preselectedSlot = slots.find((slot) => {
            const slotStart = normalizeToHHMM(slot.start_time);
            const slotEnd = normalizeToHHMM(slot.end_time);
            return slotStart === targetStart && slotEnd === targetEnd;
          });

          if (preselectedSlot) {
            setSelectedSlot(preselectedSlot);
          }
        }

        if (!slots.some((slot) => slot.is_available)) {
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
  }, [date, selectedDateKey, summaryMode, today, reservationContext.endTime, reservationContext.startTime]);

  useEffect(() => {
    if (summaryMode) {
      return;
    }

    if (!date || !selectedSlot) {
      setSpaces([]);
      setSelectedSpaceId(null);
      return;
    }

    setLoadingSpaces(true);
    setErrorMessage('');

    getReservationSpaces(selectedDateKey, selectedSlot.start_time, selectedSlot.end_time)
      .then((availableSpaces) => {
        let nextSpaces = availableSpaces;

        if (parkingConflictExists) {
          nextSpaces = nextSpaces.filter((space) => !isParkingSpace(space));
        }
        if (deskConflictExists) {
          nextSpaces = nextSpaces.filter((space) => !isDeskSpace(space));
        }
        if (roomConflictExists) {
          nextSpaces = nextSpaces.filter((space) => !isRoomSpace(space));
        }

        setSpaces(nextSpaces);
        setSelectedSpaceId((currentSelectedSpaceId) => {
          if (nextSpaces.some((space) => space.space_id === currentSelectedSpaceId)) {
            return currentSelectedSpaceId;
          }

          if (reservationContext.spaceId && nextSpaces.some((space) => space.space_id === reservationContext.spaceId)) {
            return reservationContext.spaceId;
          }

          if (reservationContext.spaceCode) {
            const matchedSpace = nextSpaces.find((space) => space.code === reservationContext.spaceCode);
            if (matchedSpace) {
              return matchedSpace.space_id;
            }
          }

          return nextSpaces[0]?.space_id ?? null;
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
  }, [date, selectedDateKey, selectedSlot, summaryMode, parkingConflictExists, deskConflictExists, roomConflictExists, reservationContext.spaceCode, reservationContext.spaceId]);

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setSelectedSlot(null);
    setSelectedSpaceId(null);
    setSpaces([]);
    setSuccessMessage('');
  };

  const handleConfirm = async () => {
    if (!date || !selectedSlot || !selectedSpaceId || !selectedSpace?.code) {
      setErrorMessage('Selecciona fecha, horario y espacio antes de continuar.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createReservation({
        start_time: buildLocalDateTime(date, selectedSlot.start_time).toISOString(),
        end_time: buildLocalDateTime(date, selectedSlot.end_time).toISOString(),
        space_id: selectedSpaceId,
        ...(reservationContext.eventId ? { event_id: reservationContext.eventId } : {}),
      });

      setSuccessMessage(`Reserva confirmada para ${selectedSpace.code}.`);
      const requests: Promise<unknown>[] = [getReservationTimeSlots(selectedDateKey)];
      if (currentUserId) {
        requests.push(getUserReservations(currentUserId));
      }

      const [refreshedSlots, refreshedReservations] = await Promise.all(requests);
      setTimeSlots(refreshedSlots as ReservationTimeSlot[]);
      if (refreshedReservations) {
        const refreshedActiveReservations = (refreshedReservations as ReservationRecord[]).filter((reservation) =>
          activeReservationStatuses.has(reservation.status),
        );
        setUserReservations(refreshedActiveReservations);
      }
      setSelectedSlot(null);
      setSelectedSpaceId(null);
      setSpaces([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible confirmar la reserva.');
    }
  };

  const handleSlotChange = (slot: ReservationTimeSlot) => {
    if (!slot.is_available) {
      return;
    }

    setSelectedSlot(slot);
    setSelectedSpaceId(null);
    setSuccessMessage('');
  };

  const canConfirmReservation = Boolean(date && selectedSlot && selectedSpaceId && selectedSpace && !loadingSlots && !loadingSpaces);

  const handleSummaryConfirm = async () => {
    if (!date || !reservationContext.spaceId) {
      setErrorMessage('No se encontró la información de la reserva.');
      return;
    }

    const startTime = reservationContext.startTime;
    const endTime = reservationContext.endTime;

    if (!startTime || !endTime) {
      setErrorMessage('No se encontró el horario de la reserva.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createReservation({
        start_time: buildLocalDateTime(date, normalizeToHHMM(startTime) ?? startTime).toISOString(),
        end_time: buildLocalDateTime(date, normalizeToHHMM(endTime) ?? endTime).toISOString(),
        space_id: reservationContext.spaceId,
        ...(reservationContext.eventId ? { event_id: reservationContext.eventId } : {}),
      });

      setSuccessMessage(`Reserva confirmada para ${reservationContext.spaceCode ?? 'el espacio seleccionado'}.`);
      setTimeout(() => {
        navigate('/reservations');
      }, 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible confirmar la reserva.');
    }
  };

  if (summaryMode) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
        <style>{css}</style>
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-5 lg:px-6">
          <div className="w-full space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                <Sparkles size={14} />
                Confirmación de reserva
              </div>
              <h1 className="mt-3 text-[1.7rem] font-bold tracking-tight sm:text-3xl">Resumen de la reservación</h1>
              <p className="mt-2 max-w-2xl text-[13px] text-slate-600 dark:text-slate-400">
                Revisa el horario y confirma. Ya no se muestran espacios aquí porque la selección se hace en el mapa.
              </p>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-400">Fecha</p>
                <p className="mt-1 text-[13px] font-semibold">
                  {date ? format(date, 'PPP', { locale: es }) : 'Sin elegir'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-400">Horario</p>
                <p className="mt-1 text-[13px] font-semibold">
                  {reservationContext.startTime && reservationContext.endTime
                    ? `${normalizeToHHMM(reservationContext.startTime) ?? reservationContext.startTime} - ${normalizeToHHMM(reservationContext.endTime) ?? reservationContext.endTime}`
                    : 'Sin elegir'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Espacio</p>
                <p className="mt-1 text-[13px] font-semibold">{reservationContext.spaceCode ?? 'Sin elegir'}</p>
              </div>
            </div>

            {reservationContext.eventId ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-700">
                Reserva vinculada al evento #{reservationContext.eventId}.
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate('/map')}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Volver al mapa
              </button>
              <button
                type="button"
                onClick={handleSummaryConfirm}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Confirmar reserva
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
      <style>{css}</style>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 lg:px-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              <Sparkles size={14} />
              Reservas
            </div>
            <h1 className="mt-3 text-[1.7rem] font-bold tracking-tight sm:text-3xl">Reserva tu espacio</h1>
            <p className="mt-2 max-w-2xl text-[13px] text-slate-600 dark:text-slate-400">
              Selecciona una fecha, el horario disponible y el espacio que quieras apartar.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-400">Sesión</p>
            <p className="text-[13px] font-semibold">{currentUserId ? `Usuario #${currentUserId}` : 'Sesión no encontrada'}</p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800 lg:sticky lg:top-6 lg:self-start lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col lg:overflow-hidden lg:space-y-3">
            <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-900/60">
              <DayPicker
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                locale={es}
                disabled={(day) => isBefore(day, today)}
                modifiers={{ today }}
                modifiersClassNames={{ today: 'font-semibold text-blue-600' }}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
              <div className="mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <CalendarIcon size={17} />
                <h2 className="text-[13px] font-semibold">Horarios</h2>
              </div>
              {loadingSlots ? (
                <p className="text-[13px] text-slate-500">Cargando horarios...</p>
              ) : validTimeSlots.length > 0 ? (
                <div className="grid max-h-[calc(100vh-22rem)] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-2 lg:max-h-none lg:flex-1 lg:content-start">
                  {validTimeSlots.map((slot) => (
                    <button
                      key={`${slot.start_time}-${slot.end_time}`}
                      type="button"
                      onClick={() => handleSlotChange(slot)}
                      disabled={!slot.is_available}
                      className={clsx(
                        'rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                        selectedSlot?.start_time === slot.start_time && selectedSlot?.end_time === slot.end_time
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900/40',
                        !slot.is_available && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <Clock size={13} />
                        {slot.start_time} - {slot.end_time}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {slot.is_available ? `${slot.available_space_count} espacios` : 'No disponible'}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-500">No hay horarios disponibles para esta fecha.</p>
              )}
            </div>
          </aside>

          <main className="space-y-6 pb-28">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <label className="flex h-12 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[13px] shadow-sm transition-colors focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-900/60">
                  <Search size={17} className="shrink-0 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar espacio o zona..."
                    className="w-full bg-transparent outline-none placeholder:text-slate-400"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  {typeFilters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setSelectedType(filter.id)}
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold transition-all',
                        selectedType === filter.id
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'border border-slate-200 bg-slate-100 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800',
                      )}
                    >
                      <Filter size={16} />
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    {date ? format(date, 'd \'de\' MMMM yyyy', { locale: es }) : 'Selecciona una fecha'}
                    {selectedSlot ? ` • ${selectedSlot.start_time} - ${selectedSlot.end_time}` : ''}
                  </p>
                </div>
                <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {visibleSpaceStats.available} espacio(s) libre(s) de {visibleSpaces.length}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Libres', value: visibleSpaceStats.available, tone: 'emerald' },
                  { label: 'Ocupados', value: visibleSpaceStats.occupied, tone: 'red' },
                  { label: 'Mantenimiento', value: visibleSpaceStats.maintenance, tone: 'amber' },
                  { label: 'Bloqueados', value: visibleSpaceStats.blocked, tone: 'slate' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${item.tone === 'emerald' ? 'text-emerald-600' : item.tone === 'red' ? 'text-red-600' : item.tone === 'amber' ? 'text-amber-600' : 'text-slate-600'}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {reservationBlockMessage ? (
                <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4 text-amber-950 shadow-sm dark:border-amber-900/40 dark:from-amber-950/40 dark:to-slate-900/40 dark:text-amber-50">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 shadow-sm dark:bg-amber-900/40 dark:text-amber-200">
                      <CalendarClock size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">
                        Reserva detectada en este horario
                      </p>
                      <p className="mt-1 text-[15px] font-bold leading-6 text-amber-950 dark:text-white">
                        Ya tienes reservado {blockedTypes.join(' y ')} en este bloque.
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-amber-800 dark:text-amber-100">
                        Esos tipos se ocultan automáticamente. Puedes cambiar el horario para ver más opciones.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {hiddenReservationDetails.length > 0 ? (
                <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      <AlertCircle size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Reservas ocultas por horario
                      </p>
                      <p className="mt-1 text-[13px] leading-6 text-slate-600 dark:text-slate-300">
                        Estos espacios no aparecen porque ya tienes reservas activas del mismo tipo en el horario seleccionado.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {hiddenReservationDetails.map((reservation) => (
                          <span key={reservation.reservationId} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {reservation.code} • {reservation.type} • {reservation.zone}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {loadingSpaces ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-5 text-center text-[13px] text-slate-500">
                  Cargando espacios disponibles...
                </div>
              ) : visibleSpaces.length > 0 ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-2">
                  {visibleSpaces.map((space) => {
                    const effectiveStatus = getEffectiveSpaceStatus(space, availableSpaceIds);
                    const spaceType = space.space_type?.name ?? 'Espacio';
                    const isSelected = selectedSpaceId === space.space_id;
                    const isAvailable = effectiveStatus === 'available';

                    return (
                      <motion.button
                        key={space.space_id}
                        type="button"
                        whileHover={isAvailable ? { y: -2 } : undefined}
                        onClick={() => {
                          if (!isAvailable) {
                            setErrorMessage(`${space.code} está ${getSpaceStatusLabel(effectiveStatus)} para este horario.`);
                            return;
                          }

                          setSelectedSpaceId(space.space_id);
                        }}
                        disabled={!isAvailable}
                        className={clsx(
                          'flex min-h-[148px] flex-col justify-between rounded-3xl border p-4 text-left shadow-sm transition-all',
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/40 dark:bg-blue-900/20'
                            : clsx(
                                getSpaceCardClass(effectiveStatus),
                                isAvailable ? 'hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-800' : '',
                              ),
                        )}
                      >
                        <div>
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                              {spaceType}
                            </span>
                            <span className="relative flex h-4 w-4 shrink-0">
                              <span className={clsx('absolute inline-flex h-full w-full rounded-full opacity-75', effectiveStatus === 'available' ? 'animate-ping bg-emerald-400' : effectiveStatus === 'occupied' ? 'bg-red-400' : effectiveStatus === 'maintenance' ? 'bg-amber-400' : 'bg-slate-400')} />
                              <span className={clsx('relative inline-flex h-4 w-4 rounded-full ring-4', effectiveStatus === 'available' ? 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-950/40' : effectiveStatus === 'occupied' ? 'bg-red-500 ring-red-100 dark:ring-red-950/40' : effectiveStatus === 'maintenance' ? 'bg-amber-500 ring-amber-100 dark:ring-amber-950/40' : 'bg-slate-500 ring-slate-100 dark:ring-slate-950/40')} />
                            </span>
                          </div>

                          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{space.code}</h3>
                          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Zona: {space.zone?.name ?? 'Sin zona'}</p>
                          <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{getSpaceStatusLabel(effectiveStatus)}</p>

                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                            {space.is_accessible ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                                Accesible
                              </span>
                            ) : null}
                            {space.is_priority ? (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                                Prioritario
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
                          <MapPin size={15} />
                          <span>{isAvailable ? 'Disponible para este horario' : `No disponible: ${getSpaceStatusLabel(effectiveStatus)}`}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                      <CalendarClock size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 dark:text-white">No hay espacios para este horario</p>
                      <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                        {reservationBlockMessage || 'Cambia el horario o quita filtros para ver más opciones disponibles.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800">
                <h2 className="text-[15px] font-semibold">Resumen de selección</h2>
                <div className="mt-4 space-y-3 text-[13px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-900/60">
                    <span>Fecha</span>
                    <span className="font-semibold">{date ? format(date, 'PPP', { locale: es }) : 'Sin elegir'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-900/60">
                    <span>Horario</span>
                    <span className="font-semibold">{selectedSlot ? `${selectedSlot.start_time} - ${selectedSlot.end_time}` : 'Sin elegir'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-900/60">
                    <span>Espacio</span>
                    <span className="font-semibold">{selectedSpace?.code ?? 'Sin elegir'}</span>
                  </div>
                </div>

                {reservationContext.eventId ? (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-700">
                    Reserva vinculada al evento #{reservationContext.eventId}.
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800">
                <h2 className="text-[15px] font-semibold">Reservas activas</h2>
                {loadingReservations ? (
                  <p className="mt-4 text-[13px] text-slate-500">Cargando reservas...</p>
                ) : selectedSlot ? (
                  selectedSlotReservations.length > 0 ? (
                    <div className="mt-4 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
                      {selectedSlotReservations.slice(0, 5).map((reservation) => (
                        <div key={reservation.reservation_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-[13px] dark:border-slate-700 dark:bg-slate-900/60">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{reservation.space.code}</p>
                              <p className="text-[11px] text-slate-500">{reservation.space.zone?.name ?? 'Sin zona'}</p>
                            </div>
                            <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              {reservation.status}
                            </span>
                          </div>
                          <p className="mt-3 text-[11px] text-slate-500">
                            {format(new Date(reservation.start_time), 'PPp', { locale: es })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                          <CalendarClock size={22} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900 dark:text-white">Sin reservas activas en este horario</p>
                          <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                            Selecciona otro horario para ver las reservas que coinciden con ese bloque.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                        <CalendarClock size={22} />
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 dark:text-white">Selecciona un horario</p>
                        <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                          Aquí aparecerán las reservas activas que coincidan con el bloque horario elegido.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>

        {canConfirmReservation ? (
          <motion.div
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 96, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-40 lg:left-72 lg:right-6"
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-2xl bg-slate-950 px-4 py-3.5 text-white shadow-2xl shadow-slate-950/30 ring-1 ring-white/10 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white/10 p-2.5 text-blue-400">
                  <CalendarIcon size={22} />
                </div>
                <div>
                  <p className="text-base font-bold leading-none">Confirmar Reserva</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {date ? format(date, 'PPP', { locale: es }) : ''} • {selectedSlot?.start_time} - {selectedSlot?.end_time} • {selectedSpace?.code}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-500"
              >
                Confirmar
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
