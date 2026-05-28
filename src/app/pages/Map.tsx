import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertTriangle,
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers3,
  Monitor,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { getCurrentUserId } from '../../services/auth';
import { getBuildings, getFloors, getSpaces, getZones, BuildingRecord, FloorRecord, ZoneRecord } from '../../services/hierarchy';
import { ApiSpace } from '../../services/space';
import { getReservationSpaces, getUserReservations, ReservationRecord } from '../../services/reservation';
import { BlockRecord, getBlocks } from '../../services/admin';

type MapSpace = ApiSpace;
type MapZone = ZoneRecord & { spaces: MapSpace[] };
type MapFloor = FloorRecord & { zones: MapZone[] };
type MapBuilding = BuildingRecord & { floors: MapFloor[] };
type Stage = 'building' | 'floor' | 'zone' | 'space';
type SpaceKind = 'desk' | 'meeting' | 'parking' | 'other';
type SpaceStatus = MapSpace['status'];

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const floorTypeLabel: Record<FloorRecord['floor_type'], string> = {
  office: 'Oficinas',
  parking: 'Estacionamiento',
};

const floorTypeIcon: Record<FloorRecord['floor_type'], React.ReactNode> = {
  office: <Monitor size={18} />,
  parking: <Car size={18} />,
};

const statusLabel: Record<SpaceStatus, string> = {
  available: 'Libre',
  occupied: 'Ocupado',
  maintenance: 'Mantenimiento',
  blocked: 'Bloqueado',
};

const statusTone: Record<SpaceStatus, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10 cursor-pointer',
  occupied: 'border-red-200 bg-red-50 text-red-700 cursor-not-allowed opacity-80',
  maintenance: 'border-amber-200 bg-amber-50 text-amber-700 cursor-not-allowed opacity-80',
  blocked: 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed opacity-70',
};

const compareByName = (left: { name: string }, right: { name: string }) => collator.compare(left.name, right.name);
const compareFloors = (left: FloorRecord, right: FloorRecord) => {
  if (left.floor_type !== right.floor_type) {
    return left.floor_type === 'office' ? -1 : 1;
  }

  return collator.compare(left.name, right.name);
};
const compareSpaces = (left: MapSpace, right: MapSpace) => collator.compare(left.code, right.code);

const getTodayLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const parseLocalDateString = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getInitialTimeRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
    endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
  };
};

const buildLocalDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const overlaps = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) => leftStart < rightEnd && leftEnd > rightStart;

const getBlockEffectiveEnd = (block: BlockRecord) => (block.end_time ? new Date(block.end_time) : new Date('2999-12-31T23:59:59.999Z'));

const getSelectedRange = (selectedDate: string, startTime: string, endTime: string) => {
  if (!selectedDate || !startTime || !endTime) {
    return null;
  }

  const selectedLocalDate = parseLocalDateString(selectedDate);
  if (!selectedLocalDate) {
    return null;
  }

  const start = buildLocalDateTime(selectedLocalDate, startTime);
  const end = buildLocalDateTime(selectedLocalDate, endTime);

  if (end <= start) {
    return null;
  }

  return { start, end };
};

const getTimeInputMin = (selectedDate: string, startTime?: string) => {
  const today = getTodayLocalDateString();
  if (selectedDate !== today) {
    return undefined;
  }

  if (startTime && startTime.trim().length > 0) {
    return startTime;
  }

  return getCurrentTimeString();
};

const isTimeBeforeNowForSelectedDate = (selectedDate: string, time: string) => {
  if (!selectedDate || !time || selectedDate !== getTodayLocalDateString()) {
    return false;
  }

  const selectedLocalDate = parseLocalDateString(selectedDate);
  if (!selectedLocalDate) {
    return false;
  }

  return buildLocalDateTime(selectedLocalDate, time) < new Date();
};

const isParkingSpace = (space: { space_type?: { name?: string } | null }) => (space.space_type?.name ?? '').toLowerCase().includes('parking');

const isDeskSpace = (space: { space_type?: { name?: string } | null }) => {
  const name = (space.space_type?.name ?? '').toLowerCase();
  return name.includes('desk') || name.includes('escritorio');
};

const isMeetingSpace = (space: { space_type?: { name?: string } | null }) => {
  const name = (space.space_type?.name ?? '').toLowerCase();
  return name.includes('room') || name.includes('sala') || name.includes('meeting') || name.includes('juntas');
};

const getSpaceKind = (space: { space_type?: { name?: string } | null }): SpaceKind => {
  if (isParkingSpace(space)) {
    return 'parking';
  }

  if (isMeetingSpace(space)) {
    return 'meeting';
  }

  if (isDeskSpace(space)) {
    return 'desk';
  }

  return 'other';
};

const getReservationEffectiveEnd = (reservation: ReservationRecord) =>
  reservation.status === 'checked_out' && reservation.check_out_time
    ? new Date(reservation.check_out_time)
    : new Date(reservation.end_time);

const getActiveReservationStatuses = () => new Set<ReservationRecord['status']>(['reserved', 'checked_in', 'checkout_pending', 'incident']);

const getNodeTone = (stats: { available: number; occupied: number; maintenance: number; blocked: number }) => {
  if (stats.available > 0) {
    return 'available';
  }

  if (stats.occupied > 0) {
    return 'occupied';
  }

  if (stats.maintenance > 0) {
    return 'maintenance';
  }

  return 'blocked';
};

function getStatusStats(spaces: MapSpace[], availabilityById: Map<number, SpaceStatus>) {
  return spaces.reduce(
    (stats, space) => {
      const status = availabilityById.get(space.space_id) ?? space.status;
      stats[status] += 1;
      return stats;
    },
    { available: 0, occupied: 0, maintenance: 0, blocked: 0 },
  );
}

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
    date: readString(navigationState.date, navigationState.selectedDate, searchParams.get('date')),
    startTime: readString(navigationState.startTime, navigationState.start_time, searchParams.get('start_time')),
    endTime: readString(navigationState.endTime, navigationState.end_time, searchParams.get('end_time')),
    spaceId: readPositiveNumber(navigationState.spaceId, navigationState.space_id, searchParams.get('space_id')),
    spaceCode: readString(navigationState.spaceCode, navigationState.code, searchParams.get('code')),
  };
}

const timeRange = getInitialTimeRange();

function HierarchyCard({
  icon,
  title,
  subtitle,
  stats,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  stats: { available: number; occupied: number; maintenance: number; blocked: number };
  onClick: () => void;
  accent: SpaceStatus;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-3xl border bg-white p-4 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 ${statusTone[accent]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-2xl p-3 transition-transform duration-200 group-hover:scale-105 ${accent === 'available' ? 'bg-emerald-100 text-emerald-700' : accent === 'occupied' ? 'bg-red-100 text-red-700' : accent === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
          {icon}
        </div>
        <ChevronRight size={18} className="mt-1 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-500" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-emerald-700 dark:bg-slate-950/70">{stats.available} libres</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-red-700 dark:bg-slate-950/70">{stats.occupied} ocupados</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-amber-700 dark:bg-slate-950/70">{stats.maintenance} mant.</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-600 dark:bg-slate-950/70">{stats.blocked} bloqueados</span>
      </div>
    </button>
  );
}

export default function MapView() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [floors, setFloors] = useState<FloorRecord[]>([]);
  const [zones, setZones] = useState<ZoneRecord[]>([]);
  const [spaces, setSpaces] = useState<MapSpace[]>([]);
  const [availabilityById, setAvailabilityById] = useState<Map<number, SpaceStatus>>(new Map());
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [userReservations, setUserReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingUserReservations, setLoadingUserReservations] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<Stage>('building');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<MapSpace | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayLocalDateString());
  const [startTime, setStartTime] = useState(timeRange.startTime);
  const [endTime, setEndTime] = useState(timeRange.endTime);
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const activeReservationStatuses = useMemo(() => getActiveReservationStatuses(), []);

  useEffect(() => {
    let mounted = true;

    Promise.all([getBuildings(), getFloors(), getZones(), getSpaces()])
      .then(([buildingData, floorData, zoneData, spaceData]) => {
        if (!mounted) {
          return;
        }

        setBuildings(buildingData ?? []);
        setFloors(floorData ?? []);
        setZones(zoneData ?? []);
        setSpaces(spaceData ?? []);
        setError('');

        const firstBuilding = buildingData?.[0] ?? null;
        const firstFloor = floorData.filter((floor) => floor.building_id === firstBuilding?.building_id).sort(compareFloors)[0] ?? null;
        const firstZone = zoneData.filter((zone) => zone.floor_id === firstFloor?.floor_id).sort(compareByName)[0] ?? null;

        setSelectedBuildingId(firstBuilding?.building_id ?? null);
        setSelectedFloorId(firstFloor?.floor_id ?? null);
        setSelectedZoneId(firstZone?.zone_id ?? null);
        setSelectedSpace(null);
        setStage('building');
      })
      .catch((fetchError) => {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar el mapa.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoadingBlocks(true);

    getBlocks()
      .then((data) => {
        if (mounted) {
          setBlocks(data ?? []);
        }
      })
      .catch(() => {
        if (mounted) {
          setBlocks([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingBlocks(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let mounted = true;
    setLoadingUserReservations(true);

    getUserReservations(currentUserId)
      .then((data) => {
        if (!mounted) {
          return;
        }

        setUserReservations((data ?? []).filter((reservation) => activeReservationStatuses.has(reservation.status)));
      })
      .catch(() => {
        if (mounted) {
          setUserReservations([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingUserReservations(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeReservationStatuses, currentUserId]);

  useEffect(() => {
    const selectedRange = getSelectedRange(selectedDate, startTime, endTime);

    if (!selectedRange) {
      setAvailabilityById(new Map());
      return;
    }

    let mounted = true;
    setLoadingAvailability(true);

    // Request availability both for the current user and for anonymous (all users)
    // so we can compute which space types were removed by the server when
    // filtering for the user (these are the types we should hide in the map).
    Promise.all([
      getReservationSpaces(selectedDate, startTime, endTime, currentUserId),
      getReservationSpaces(selectedDate, startTime, endTime),
    ])
      .then(([availableForUser, availableAll]) => {
        if (!mounted) return;

        const nextAvailability = new Map<number, SpaceStatus>();
        for (const space of availableForUser) nextAvailability.set(space.space_id, 'available');

        setAvailabilityById(nextAvailability);

        // Build sets of kinds present in each response
        const allById = new Map(spaces.map((s) => [s.space_id, s]));

        const kindsAll = new Set<SpaceKind>();
        for (const s of availableAll) {
          const full = allById.get(s.space_id) ?? s;
          kindsAll.add(getSpaceKind(full));
        }

        const kindsForUser = new Set<SpaceKind>();
        for (const s of availableForUser) {
          const full = allById.get(s.space_id) ?? s;
          kindsForUser.add(getSpaceKind(full));
        }

        const removedKinds = new Set<SpaceKind>();
        for (const k of kindsAll) if (!kindsForUser.has(k)) removedKinds.add(k);

        hiddenKindsRef.current = removedKinds;
      })
      .catch(() => {
        if (!mounted) return;
        setAvailabilityById(new Map());
        hiddenKindsRef.current = new Set();
      })
      .finally(() => {
        if (mounted) setLoadingAvailability(false);
      });

    return () => {
      mounted = false;
    };
  }, [endTime, selectedDate, startTime, currentUserId]);

  const tree = useMemo<MapBuilding[]>(() => {
    return [...buildings]
      .sort(compareByName)
      .map((building) => ({
        ...building,
        floors: floors
          .filter((floor) => floor.building_id === building.building_id)
          .sort(compareFloors)
          .map((floor) => ({
            ...floor,
            zones: zones
              .filter((zone) => zone.floor_id === floor.floor_id)
              .sort(compareByName)
              .map((zone) => ({
                ...zone,
                spaces: spaces.filter((space) => space.zone_id === zone.zone_id).sort(compareSpaces),
              })),
          })),
      }));
  }, [buildings, floors, spaces, zones]);

  const selectedRange = useMemo(() => getSelectedRange(selectedDate, startTime, endTime), [endTime, selectedDate, startTime]);
  const availableSpaceIds = useMemo(() => new Set(availabilityById.keys()), [availabilityById]);
  const resolvedStatusById = useMemo(() => {
    const nextStatus = new Map<number, SpaceStatus>();

    if (!selectedRange) {
      for (const space of spaces) {
        nextStatus.set(space.space_id, space.status);
      }

      return nextStatus;
    }

    const blockedSpaceIds = new Set<number>();
    const blockedZoneIds = new Set<number>();

    for (const block of blocks) {
      if (!overlaps(selectedRange.start, selectedRange.end, new Date(block.start_time), getBlockEffectiveEnd(block))) {
        continue;
      }

      if (block.space_id) {
        blockedSpaceIds.add(block.space_id);
      }

      if (block.zone_id) {
        blockedZoneIds.add(block.zone_id);
      }
    }

    for (const space of spaces) {
      if (space.status === 'maintenance' || space.status === 'blocked') {
        nextStatus.set(space.space_id, space.status);
        continue;
      }

      if (blockedSpaceIds.has(space.space_id) || blockedZoneIds.has(space.zone_id)) {
        nextStatus.set(space.space_id, 'blocked');
        continue;
      }

      nextStatus.set(space.space_id, availableSpaceIds.has(space.space_id) ? 'available' : 'occupied');
    }

    return nextStatus;
  }, [availableSpaceIds, blocks, selectedRange, spaces]);

  const slotReservations = useMemo(() => {
    if (!selectedDate || !startTime || !endTime) {
      return [];
    }

    const slotStart = buildLocalDateTime(new Date(selectedDate), startTime);
    const slotEnd = buildLocalDateTime(new Date(selectedDate), endTime);

    return userReservations.filter((reservation) => {
      if (!activeReservationStatuses.has(reservation.status)) {
        return false;
      }

      return overlaps(slotStart, slotEnd, new Date(reservation.start_time), getReservationEffectiveEnd(reservation));
    });
  }, [activeReservationStatuses, endTime, selectedDate, startTime, userReservations]);

  const hiddenKindsRef = useRef<Set<SpaceKind>>(new Set());

  const hiddenTypes = useMemo(() => {
    const kinds = new Set<SpaceKind>();

    for (const reservation of slotReservations) {
      kinds.add(getSpaceKind(reservation.space));
    }

    // Merge server-derived removed kinds (computed in availability effect)
    for (const k of hiddenKindsRef.current) kinds.add(k);

    return kinds;
  }, [slotReservations]);

  const visibleTree = useMemo<MapBuilding[]>(() => {
    return tree
      .map((building) => ({
        ...building,
        floors: building.floors
          .map((floor) => ({
            ...floor,
            zones: floor.zones
              .map((zone) => ({
                ...zone,
                spaces: zone.spaces.filter((space) => !hiddenTypes.has(getSpaceKind(space))),
              }))
              .filter((zone) => zone.spaces.length > 0),
          }))
          .filter((floor) => floor.zones.length > 0),
      }))
      .filter((building) => building.floors.length > 0);
  }, [hiddenTypes, tree]);

  const selectedBuilding = useMemo(
    () => visibleTree.find((building) => building.building_id === selectedBuildingId) ?? null,
    [selectedBuildingId, visibleTree],
  );
  const selectedFloor = useMemo(
    () => selectedBuilding?.floors.find((floor) => floor.floor_id === selectedFloorId) ?? null,
    [selectedBuilding, selectedFloorId],
  );
  const selectedZone = useMemo(
    () => selectedFloor?.zones.find((zone) => zone.zone_id === selectedZoneId) ?? null,
    [selectedFloor, selectedZoneId],
  );

  const visibleZoneSpaces = useMemo(() => selectedZone?.spaces ?? [], [selectedZone]);

  const selectedSpaceEffectiveStatus = useMemo(() => {
    if (!selectedSpace) {
      return null;
    }

    return resolvedStatusById.get(selectedSpace.space_id) ?? selectedSpace.status;
  }, [resolvedStatusById, selectedSpace]);

  useEffect(() => {
    if (!selectedSpace) {
      return;
    }

    const effectiveStatus = resolvedStatusById.get(selectedSpace.space_id) ?? selectedSpace.status;
    if (effectiveStatus !== 'available') {
      setSelectedSpace(null);
    }
  }, [resolvedStatusById, selectedSpace]);

  const goToBuilding = () => {
    setStage('building');
    setSelectedFloorId(null);
    setSelectedZoneId(null);
    setSelectedSpace(null);
  };

  const goToFloor = () => {
    setStage('floor');
    setSelectedZoneId(null);
    setSelectedSpace(null);
  };

  const goToZone = () => {
    setStage('zone');
    setSelectedSpace(null);
  };

  const selectBuilding = (building: MapBuilding) => {
    setSelectedBuildingId(building.building_id);
    const firstFloor = building.floors[0] ?? null;
    setSelectedFloorId(firstFloor?.floor_id ?? null);
    setSelectedZoneId(firstFloor?.zones[0]?.zone_id ?? null);
    setSelectedSpace(null);
    setStage('floor');
  };

  const selectFloor = (floor: MapFloor) => {
    setSelectedFloorId(floor.floor_id);
    setSelectedZoneId(floor.zones[0]?.zone_id ?? null);
    setSelectedSpace(null);
    setStage('zone');
  };

  const selectZone = (zone: MapZone) => {
    setSelectedZoneId(zone.zone_id);
    setSelectedSpace(null);
    setStage('space');
  };

  const handleSpaceClick = (space: MapSpace) => {
    const effectiveStatus = availabilityById.get(space.space_id) ?? space.status;

    if (effectiveStatus !== 'available') {
      toast.error(`El espacio ${space.code} no está disponible para este horario.`);
      return;
    }

    setSelectedSpace((currentSelectedSpace) => (currentSelectedSpace?.space_id === space.space_id ? null : space));
  };

  const handleReserve = () => {
    if (!selectedSpace) {
      return;
    }

    navigate('/reservation', {
      state: {
        date: selectedDate,
        startTime,
        endTime,
        spaceId: selectedSpace.space_id,
        spaceCode: selectedSpace.code,
      },
    });
  };

  const breadcrumbItems = [
    { label: 'Edificios', active: stage === 'building', onClick: stage !== 'building' ? goToBuilding : undefined },
    ...(selectedBuilding ? [{ label: selectedBuilding.name, active: stage === 'floor', onClick: stage !== 'floor' ? goToFloor : undefined }] : []),
    ...(selectedFloor ? [{ label: `Piso ${selectedFloor.name}`, active: stage === 'zone', onClick: stage !== 'zone' ? goToZone : undefined }] : []),
    ...(selectedZone ? [{ label: `Zona ${selectedZone.name}`, active: stage === 'space' }] : []),
  ];

  const hiddenTypesMessage = hiddenTypes.size > 0
    ? `No se muestran cards de ${Array.from(hiddenTypes)
        .map((kind) => (kind === 'parking' ? 'Parking' : kind === 'meeting' ? 'Meeting Room' : 'Desk'))
        .join(', ')} porque ya tienes una reserva activa de ese mismo tipo en este horario.`
    : '';

  const availabilityMessage = loadingAvailability || loadingBlocks
    ? 'Actualizando disponibilidad...'
    : '';

  const handleDateChange = (nextDate: string) => {
    setSelectedDate(nextDate);
    setSelectedSpace(null);

    if (isTimeBeforeNowForSelectedDate(nextDate, startTime)) {
      setStartTime(getCurrentTimeString());
    }

    if (isTimeBeforeNowForSelectedDate(nextDate, endTime)) {
      setEndTime(getCurrentTimeString());
    }
  };

  const handleStartTimeChange = (nextTime: string) => {
    if (isTimeBeforeNowForSelectedDate(selectedDate, nextTime)) {
      toast.error('No puedes seleccionar una hora de inicio anterior a la actual.');
      return;
    }

    setStartTime(nextTime);
    setSelectedSpace(null);
  };

  const handleEndTimeChange = (nextTime: string) => {
    if (isTimeBeforeNowForSelectedDate(selectedDate, nextTime)) {
      toast.error('No puedes seleccionar una hora de fin anterior a la actual.');
      return;
    }

    setEndTime(nextTime);
    setSelectedSpace(null);
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">Cargando mapa...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              <Layers3 size={14} />
              Mapa de Espacios
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edificios, pisos, zonas y espacios</h1>
              <p className="mt-2 text-sm text-slate-300">El mapa cambia por horario en tiempo real. Solo se puede reservar lo disponible y los espacios repetidos del mismo tipo se ocultan automáticamente.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[32rem]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400">Edificios</p>
              <p className="mt-1 text-2xl font-bold">{visibleTree.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400">Pisos</p>
              <p className="mt-1 text-2xl font-bold">{floors.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400">Espacios</p>
              <p className="mt-1 text-2xl font-bold">{visibleTree.reduce((total, building) => total + building.floors.reduce((floorTotal, floor) => floorTotal + floor.zones.reduce((zoneTotal, zone) => zoneTotal + zone.spaces.length, 0), 0), 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {hiddenTypesMessage ? (
        <div className="rounded-[2rem] border-2 border-amber-300 bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 px-5 py-4 text-amber-950 shadow-lg shadow-amber-500/10 ring-1 ring-amber-200/70 dark:border-amber-800 dark:from-amber-950/60 dark:via-slate-900 dark:to-amber-950/60 dark:text-amber-50 dark:shadow-amber-950/30 dark:ring-amber-900/40">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-200 p-3 text-amber-800 shadow-sm dark:bg-amber-900/50 dark:text-amber-100">
              <AlertTriangle size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black uppercase tracking-[0.25em] text-amber-700 dark:text-amber-200">
                Cards ocultas por reserva del mismo tipo
              </p>
              <p className="mt-1 text-[15px] font-bold leading-6 text-amber-950 dark:text-white">
                {hiddenTypesMessage}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-amber-800 dark:text-amber-100">
                Cambia el horario para volver a ver esas cards.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40">
            <Clock size={18} className="text-slate-400" />
            <span className="w-14 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fecha</span>
            <input
              type="date"
              value={selectedDate}
              min={getTodayLocalDateString()}
              onChange={(event) => handleDateChange(event.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40">
            <Clock size={18} className="text-slate-400" />
            <span className="w-14 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Inicio</span>
            <input
              type="time"
              value={startTime}
              min={getTimeInputMin(selectedDate)}
              onChange={(event) => handleStartTimeChange(event.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40">
            <Clock size={18} className="text-slate-400" />
            <span className="w-14 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fin</span>
            <input
              type="time"
              value={endTime}
              min={getTimeInputMin(selectedDate, startTime)}
              onChange={(event) => handleEndTimeChange(event.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" /> Libre</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-400" /> Ocupado</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" /> Mantenimiento</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" /> Bloqueado</span>
          <span className="ml-auto text-[11px] normal-case tracking-normal text-slate-400">
            {availabilityMessage}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">Desk</span>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">Meeting Room</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">Parking</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Espacio</span>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {stage === 'building' ? 'Edificios' : stage === 'floor' ? 'Pisos' : stage === 'zone' ? 'Zonas' : 'Espacios'}
            </h2>
            <p className="text-sm text-slate-500">
              {stage === 'building'
                ? 'Selecciona un edificio para desplegar sus pisos.'
                : stage === 'floor'
                  ? 'Selecciona un piso para desplegar sus zonas.'
                  : stage === 'zone'
                    ? 'Selecciona una zona para ver el mapa clásico de espacios.'
                    : 'Solo se muestran espacios permitidos para este horario.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (stage === 'space') {
                goToZone();
              } else if (stage === 'zone') {
                goToFloor();
              } else if (stage === 'floor') {
                goToBuilding();
              }
            }}
            disabled={stage === 'building'}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={16} />
            Volver
          </button>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
          <span className={`rounded-full px-3 py-1 ${stage === 'building' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300'}`}>Edificios</span>
          <span className={`rounded-full px-3 py-1 ${stage === 'floor' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300'}`}>Pisos</span>
          <span className={`rounded-full px-3 py-1 ${stage === 'zone' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300'}`}>Zonas</span>
          <span className={`rounded-full px-3 py-1 ${stage === 'space' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300'}`}>Espacios</span>
        </div>

        {stage === 'building' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleTree.map((building) => {
              const stats = getStatusStats(building.floors.flatMap((floor) => floor.zones.flatMap((zone) => zone.spaces)), resolvedStatusById);
              return (
                <HierarchyCard
                  key={building.building_id}
                  icon={<Building2 size={18} />}
                  title={building.name}
                  subtitle={`${building.floors.length} piso(s)`}
                  stats={stats}
                  accent={getNodeTone(stats)}
                  onClick={() => selectBuilding(building)}
                />
              );
            })}
          </div>
        ) : stage === 'floor' && selectedBuilding ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {selectedBuilding.floors.map((floor) => {
              const stats = getStatusStats(floor.zones.flatMap((zone) => zone.spaces), resolvedStatusById);
              return (
                <HierarchyCard
                  key={floor.floor_id}
                  icon={floorTypeIcon[floor.floor_type]}
                  title={`Piso ${floor.name}`}
                  subtitle={floorTypeLabel[floor.floor_type]}
                  stats={stats}
                  accent={getNodeTone(stats)}
                  onClick={() => selectFloor(floor)}
                />
              );
            })}
          </div>
        ) : stage === 'zone' && selectedFloor ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {selectedFloor.zones.map((zone) => {
              const stats = getStatusStats(zone.spaces, resolvedStatusById);
              return (
                <HierarchyCard
                  key={zone.zone_id}
                  icon={<Layers3 size={18} />}
                  title={`Zona ${zone.name}`}
                  subtitle={`${zone.spaces.length} espacio(s)`}
                  stats={stats}
                  accent={getNodeTone(stats)}
                  onClick={() => selectZone(zone)}
                />
              );
            })}
          </div>
        ) : stage === 'space' && selectedZone ? (
          <div className="space-y-4">
            {hiddenTypesMessage ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-50">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">Espacios ocultos</p>
                    <p className="mt-1 text-sm leading-6">{hiddenTypesMessage}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950/30">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Zona seleccionada</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Zona {selectedZone.name}</h3>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${selectedFloor?.floor_type === 'parking' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {selectedFloor?.floor_type === 'parking' ? <Car size={14} /> : <Monitor size={14} />}
                  {selectedFloor ? floorTypeLabel[selectedFloor.floor_type] : 'Nivel'}
                </div>
              </div>

              <div className="min-h-[26rem] overflow-auto p-2 sm:min-h-[34rem]">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleZoneSpaces.map((space) => {
                    const effectiveStatus = resolvedStatusById.get(space.space_id) ?? space.status;
                    const selected = selectedSpace?.space_id === space.space_id;
                    const isAvailable = effectiveStatus === 'available';
                    const spaceTypeName = space.space_type?.name ?? 'Espacio';

                    return (
                      <button
                        key={space.space_id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSpaceClick(space)}
                        className={`group relative h-24 rounded-2xl border text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl ${statusTone[effectiveStatus]} ${selected ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950' : ''}`}
                      >
                        <div className="flex h-full items-center justify-center px-2">
                          <div className="space-y-1">
                            <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                              {spaceTypeName}
                            </span>
                            <span className="block text-sm font-semibold leading-tight">{space.code}</span>
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">{statusLabel[effectiveStatus]}</span>
                          </div>
                        </div>
                        {effectiveStatus !== 'available' ? (
                          <div className={`absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-white px-1.5 text-[10px] font-bold shadow-sm ${effectiveStatus === 'blocked' ? 'bg-slate-100 text-slate-600' : effectiveStatus === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {statusLabel[effectiveStatus]}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {visibleZoneSpaces.length === 0 ? (
                  <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                    {hiddenTypesMessage || 'No hay espacios visibles para esta zona y horario.'}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStage('zone')}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cambiar de zona
              </button>
              <button
                type="button"
                onClick={goToZone}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                Volver al piso
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
            Selecciona un edificio para empezar.
          </div>
        )}
      </div>

      {selectedSpace && selectedSpaceEffectiveStatus === 'available' ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/20 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Clock size={15} />
                <span className="text-xs font-semibold uppercase tracking-widest">Espacio seleccionado</span>
              </div>
              <h4 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{selectedSpace.code}</h4>
              <p className="text-sm text-slate-400">{selectedSpace.space_type?.name ?? 'Espacio'}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSpace(null)}
              className="rounded-full border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <ChevronLeft size={15} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-slate-400">Estado</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{statusLabel[selectedSpaceEffectiveStatus]}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-slate-400">Tipo</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{selectedSpace.space_type?.name ?? 'Espacio'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-slate-400">Accesible</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{selectedSpace.is_accessible ? 'Sí' : 'No'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-slate-400">Prioridad</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{selectedSpace.is_priority ? 'Sí' : 'No'}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleReserve}
              className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Reservar
            </button>
            <button
              type="button"
              onClick={() => setSelectedSpace(null)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}