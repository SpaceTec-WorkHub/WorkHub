import React, { useEffect, useMemo, useState } from 'react';
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
import { getCurrentUserId } from '../../services/auth';
import { useToast } from '../components/feedback/ToastProvider';
import { getBuildings, getFloors, getSpaces, getZones, BuildingRecord, FloorRecord, ZoneRecord } from '../../services/hierarchy';
import { ApiSpace } from '../../services/space';
import { createReservation, getReservationSpaces, getUserReservations, ReservationRecord } from '../../services/reservation';
import { BlockRecord, getBlocks } from '../../services/admin';

type MapSpace = ApiSpace;
type MapZone = ZoneRecord & { spaces: MapSpace[] };
type MapFloor = FloorRecord & { zones: MapZone[] };
type MapBuilding = BuildingRecord & { floors: MapFloor[] };
type Stage = 'building' | 'floor' | 'zone' | 'space';
type InitStage = 'parking-prompt' | 'parking-select' | 'main';
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
  available: 'border-purple-200 bg-purple-50 text-purple-800 hover:border-purple-300 hover:bg-purple-100 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-900/10 cursor-pointer',
  occupied: 'border-red-200 bg-red-50 text-red-700 cursor-not-allowed opacity-80',
  maintenance: 'border-blue-200 bg-blue-50 text-blue-700 cursor-not-allowed opacity-80',
  blocked: 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed opacity-70',
};

const stageOrder: Record<Stage, number> = { building: 0, floor: 1, zone: 2, space: 3 };

const getBreadcrumbTone = (current: Stage, target: Stage) => {
  if (current === target) {
    return 'bg-purple-600 text-white cursor-default';
  }

  if (stageOrder[target] < stageOrder[current]) {
    return 'bg-white text-slate-500 hover:bg-purple-100 hover:text-purple-700 cursor-pointer dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-purple-900/40 dark:hover:text-purple-200';
  }

  return 'bg-white text-slate-300 cursor-not-allowed dark:bg-slate-900 dark:text-slate-600';
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
        <div className={`rounded-2xl p-3 transition-transform duration-200 group-hover:scale-105 ${accent === 'available' ? 'bg-purple-100 text-purple-700' : accent === 'occupied' ? 'bg-red-100 text-red-700' : accent === 'maintenance' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
          {icon}
        </div>
        <ChevronRight size={18} className="mt-1 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-500" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-purple-700 dark:bg-slate-950/70">{stats.available} libres</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-red-700 dark:bg-slate-950/70">{stats.occupied} ocupados</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-blue-700 dark:bg-slate-950/70">{stats.maintenance} mant.</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-600 dark:bg-slate-950/70">{stats.blocked} bloqueados</span>
      </div>
    </button>
  );
}

export default function MapView() {
  const navigate = useNavigate();
  const toast = useToast();
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
  const [hiddenKinds, setHiddenKinds] = useState<Set<SpaceKind>>(new Set());
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Parking pre-step state
  const [initStage, setInitStage] = useState<InitStage>('parking-prompt');
  const [parkingNavStage, setParkingNavStage] = useState<Stage>('building');
  const [parkingBuildingId, setParkingBuildingId] = useState<number | null>(null);
  const [parkingFloorId, setParkingFloorId] = useState<number | null>(null);
  const [parkingZoneId, setParkingZoneId] = useState<number | null>(null);
  const [selectedParkingSpaceId, setSelectedParkingSpaceId] = useState<number | null>(null);
  const [parkingDate, setParkingDate] = useState(() => getTodayLocalDateString());
  const [parkingStartTime, setParkingStartTime] = useState(timeRange.startTime);
  const [parkingEndTime, setParkingEndTime] = useState(timeRange.endTime);
  const [parkingAvailabilityById, setParkingAvailabilityById] = useState<Map<number, SpaceStatus>>(new Map());
  const [parkingConflict, setParkingConflict] = useState(false);
  const [loadingParkingAvailability, setLoadingParkingAvailability] = useState(false);
  const [confirmingParking, setConfirmingParking] = useState(false);

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

        setHiddenKinds(removedKinds);
      })
      .catch(() => {
        if (!mounted) return;
        setAvailabilityById(new Map());
        setHiddenKinds(new Set());
      })
      .finally(() => {
        if (mounted) setLoadingAvailability(false);
      });

    return () => {
      mounted = false;
    };
  }, [endTime, selectedDate, startTime, currentUserId, spaces]);

  useEffect(() => {
    if (initStage !== 'parking-select') return;
    const range = getSelectedRange(parkingDate, parkingStartTime, parkingEndTime);
    if (!range) { setParkingAvailabilityById(new Map()); setParkingConflict(false); return; }

    let mounted = true;
    setLoadingParkingAvailability(true);

    Promise.all([
      getReservationSpaces(parkingDate, parkingStartTime, parkingEndTime, currentUserId),
      getReservationSpaces(parkingDate, parkingStartTime, parkingEndTime),
    ])
      .then(([availableForUser, availableAll]) => {
        if (!mounted) return;
        const next = new Map<number, SpaceStatus>();
        for (const s of availableForUser) next.set(s.space_id, 'available');
        setParkingAvailabilityById(next);

        // Parking en conflicto directo si el servidor lo retira para este usuario
        // pero existe disponibilidad general — distingue parking propio vs parking de invitado
        const allHasParking = availableAll.some((s) => isParkingSpace(s));
        const userHasParking = availableForUser.some((s) => isParkingSpace(s));
        setParkingConflict(allHasParking && !userHasParking);
      })
      .catch(() => { if (mounted) { setParkingAvailabilityById(new Map()); setParkingConflict(false); } })
      .finally(() => { if (mounted) setLoadingParkingAvailability(false); });

    return () => { mounted = false; };
  }, [initStage, parkingDate, parkingStartTime, parkingEndTime, currentUserId]);

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

  // Parking tree: same hierarchy but filtered to parking spaces only
  const parkingTree = useMemo<MapBuilding[]>(() => {
    return tree
      .map((building) => ({
        ...building,
        floors: building.floors
          .map((floor) => ({
            ...floor,
            zones: floor.zones
              .map((zone) => ({
                ...zone,
                spaces: zone.spaces.filter(isParkingSpace),
              }))
              .filter((zone) => zone.spaces.length > 0),
          }))
          .filter((floor) => floor.zones.length > 0),
      }))
      .filter((building) => building.floors.length > 0);
  }, [tree]);

  const parkingSelectedBuilding = useMemo(
    () => parkingTree.find((b) => b.building_id === parkingBuildingId) ?? null,
    [parkingBuildingId, parkingTree],
  );
  const parkingSelectedFloor = useMemo(
    () => parkingSelectedBuilding?.floors.find((f) => f.floor_id === parkingFloorId) ?? null,
    [parkingSelectedBuilding, parkingFloorId],
  );
  const parkingSelectedZone = useMemo(
    () => parkingSelectedFloor?.zones.find((z) => z.zone_id === parkingZoneId) ?? null,
    [parkingSelectedFloor, parkingZoneId],
  );
  const selectedParkingSpace = useMemo(
    () => spaces.find((s) => s.space_id === selectedParkingSpaceId) ?? null,
    [selectedParkingSpaceId, spaces],
  );

  const parkingStatusById = useMemo(() => {
    const map = new Map<number, SpaceStatus>();
    const parkingRange = getSelectedRange(parkingDate, parkingStartTime, parkingEndTime);
    for (const building of parkingTree) {
      for (const floor of building.floors) {
        for (const zone of floor.zones) {
          for (const space of zone.spaces) {
            if (space.status === 'maintenance' || space.status === 'blocked') {
              map.set(space.space_id, space.status);
            } else if (!parkingRange || loadingParkingAvailability) {
              map.set(space.space_id, space.status);
            } else {
              map.set(space.space_id, parkingAvailabilityById.has(space.space_id) ? 'available' : 'occupied');
            }
          }
        }
      }
    }
    return map;
  }, [loadingParkingAvailability, parkingAvailabilityById, parkingDate, parkingEndTime, parkingStartTime, parkingTree]);

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
      if (!activeReservationStatuses.has(reservation.status)) return false;
      // Las incidencias no bloquean: el usuario debe poder elegir un espacio alternativo del mismo tipo
      if (reservation.status === 'incident') return false;
      // Excluir reservas de invitado y sub-reservas de parking: no deben ocultar tipos propios
      if (reservation.is_guest_reservation) return false;
      if (reservation.parent_reservation_id != null) return false;
      return overlaps(slotStart, slotEnd, new Date(reservation.start_time), getReservationEffectiveEnd(reservation));
    });
  }, [activeReservationStatuses, endTime, selectedDate, startTime, userReservations]);

  const hiddenTypes = useMemo(() => {
    const kinds = new Set<SpaceKind>();

    for (const reservation of slotReservations) {
      kinds.add(getSpaceKind(reservation.space));
    }

    for (const k of hiddenKinds) kinds.add(k);

    return kinds;
  }, [hiddenKinds, slotReservations]);

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
                spaces: zone.spaces.filter((space) => {
                  if (isParkingSpace(space)) return false;
                  // En modo invitado se muestran todos los tipos aunque el usuario ya tenga uno reservado
                  if (isGuestMode) return true;
                  return !hiddenTypes.has(getSpaceKind(space));
                }),
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

  const goToParkingBuilding = () => {
    setParkingNavStage('building');
    setParkingBuildingId(null);
    setParkingFloorId(null);
    setParkingZoneId(null);
  };

  const goToParkingFloor = () => {
    setParkingNavStage('floor');
    setParkingFloorId(null);
    setParkingZoneId(null);
  };

  const goToParkingZone = () => {
    setParkingNavStage('zone');
    setParkingZoneId(null);
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
    if (!selectedSpace) return;
    navigate('/reservation', {
      state: {
        date: selectedDate,
        startTime,
        endTime,
        spaceId: selectedSpace.space_id,
        spaceCode: selectedSpace.code,
        isGuestReservation: isGuestMode,
      },
    });
  };

  const handleConfirmParking = async () => {
    if (!selectedParkingSpaceId) {
      setInitStage('main');
      return;
    }
    const parkingLocalDate = parseLocalDateString(parkingDate);
    if (!parkingLocalDate) { setInitStage('main'); return; }

    setConfirmingParking(true);
    try {
      await createReservation({
        start_time: buildLocalDateTime(parkingLocalDate, parkingStartTime).toISOString(),
        end_time: buildLocalDateTime(parkingLocalDate, parkingEndTime).toISOString(),
        space_id: selectedParkingSpaceId,
      });
      toast.success(`Estacionamiento ${selectedParkingSpace?.code ?? ''} reservado correctamente.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible reservar el estacionamiento.');
    } finally {
      setConfirmingParking(false);
      setInitStage('main');
    }
  };

  const breadcrumbItems = [
    { label: 'Edificios', active: stage === 'building', onClick: stage !== 'building' ? goToBuilding : undefined },
    ...(selectedBuilding ? [{ label: selectedBuilding.name, active: stage === 'floor', onClick: stage !== 'floor' ? goToFloor : undefined }] : []),
    ...(selectedFloor ? [{ label: `Piso ${selectedFloor.name}`, active: stage === 'zone', onClick: stage !== 'zone' ? goToZone : undefined }] : []),
    ...(selectedZone ? [{ label: `Zona ${selectedZone.name}`, active: stage === 'space' }] : []),
  ];

  const nonParkingHiddenTypes = useMemo(() => new Set([...hiddenTypes].filter((k) => k !== 'parking')), [hiddenTypes]);
  const hiddenTypesMessage = nonParkingHiddenTypes.size > 0
    ? `No se muestran cards de ${Array.from(nonParkingHiddenTypes)
        .map((kind) => (kind === 'meeting' ? 'Meeting Room' : 'Desk'))
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

  // ── Pantalla 1: Pregunta de estacionamiento ──────────────────────────────
  if (initStage === 'parking-prompt') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-8">
        <div className="w-[min(96vw,460px)] space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-3xl bg-purple-100 p-5 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300">
              <Car size={36} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">¿Necesitas estacionamiento?</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Reserva un espacio de estacionamiento antes de elegir tu área de trabajo. Puedes omitirlo si llegas caminando o en transporte.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => { setInitStage('parking-select'); setParkingNavStage('building'); }}
              className="w-full rounded-2xl bg-purple-500 px-4 py-4 text-base font-semibold text-white shadow-md shadow-purple-500/20 transition hover:bg-purple-600"
            >
              Sí, quiero reservar estacionamiento
            </button>
            <button
              type="button"
              onClick={() => setInitStage('main')}
              className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-base font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              No, continuar sin estacionamiento
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">Cargando mapa...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">{error}</div>;
  }

  // ── Pantalla 2: Selección de estacionamiento ──────────────────────────────
  if (initStage === 'parking-select') {
    const parkingNodeCard = 'group rounded-3xl border border-purple-200 bg-purple-50 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-purple-900/30 dark:bg-purple-950/20';
    const getParkingNodeStats = (ss: MapSpace[]) =>
      ss.reduce((acc, s) => { acc[parkingStatusById.get(s.space_id) ?? s.status] += 1; return acc; }, { available: 0, occupied: 0, maintenance: 0, blocked: 0 });

    return (
      <div className="space-y-5 pb-44">
        {/* Cabecera + selectores de horario */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                <Car size={13} />
                Reserva de estacionamiento
              </div>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Elige tu espacio de parking</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Selecciona el horario y el espacio que necesites.</p>
            </div>
            <button
              type="button"
              onClick={() => setInitStage('main')}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Omitir estacionamiento
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-purple-500 dark:border-slate-700 dark:bg-slate-950/40">
              <Clock size={18} className="text-slate-400" />
              <span className="w-14 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fecha</span>
              <input
                type="date"
                value={parkingDate}
                min={getTodayLocalDateString()}
                onChange={(e) => { setParkingDate(e.target.value); setSelectedParkingSpaceId(null); }}
                className="w-full bg-transparent outline-none"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-purple-500 dark:border-slate-700 dark:bg-slate-950/40">
              <Clock size={18} className="text-slate-400" />
              <span className="w-14 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Inicio</span>
              <input
                type="time"
                value={parkingStartTime}
                onChange={(e) => { setParkingStartTime(e.target.value); setSelectedParkingSpaceId(null); }}
                className="w-full bg-transparent outline-none"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-purple-500 dark:border-slate-700 dark:bg-slate-950/40">
              <Clock size={18} className="text-slate-400" />
              <span className="w-14 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fin</span>
              <input
                type="time"
                value={parkingEndTime}
                onChange={(e) => { setParkingEndTime(e.target.value); setSelectedParkingSpaceId(null); }}
                className="w-full bg-transparent outline-none"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-purple-400" /> Libre</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-400" /> Ocupado</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-400" /> Mantenimiento</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" /> Bloqueado</span>
            {loadingParkingAvailability && <span className="ml-auto normal-case tracking-normal text-slate-400">Actualizando disponibilidad...</span>}
          </div>
        </div>

        {/* Mini-mapa de parking */}
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {parkingNavStage === 'building' ? 'Edificios' : parkingNavStage === 'floor' ? 'Pisos' : parkingNavStage === 'zone' ? 'Zonas' : 'Espacios'}
              </h2>
              <p className="text-sm text-slate-500">
                {parkingNavStage === 'building' ? 'Selecciona un edificio con estacionamiento.'
                  : parkingNavStage === 'floor' ? 'Selecciona el piso de estacionamiento.'
                  : parkingNavStage === 'zone' ? 'Selecciona una zona del estacionamiento.'
                  : 'Elige el espacio de parking que prefieras.'}
              </p>
            </div>
            <button
              type="button"
              disabled={parkingNavStage === 'building'}
              onClick={() => {
                if (parkingNavStage === 'space') { setParkingNavStage('zone'); setParkingZoneId(null); }
                else if (parkingNavStage === 'zone') { setParkingNavStage('floor'); setParkingFloorId(null); }
                else if (parkingNavStage === 'floor') { setParkingNavStage('building'); setParkingBuildingId(null); }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
              Volver
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={goToParkingBuilding}
              disabled={parkingNavStage === 'building'}
              className={`rounded-full px-3 py-1 transition ${getBreadcrumbTone(parkingNavStage, 'building')}`}
            >
              Edificios
            </button>
            <button
              type="button"
              onClick={goToParkingFloor}
              disabled={stageOrder[parkingNavStage] <= stageOrder.floor}
              className={`rounded-full px-3 py-1 transition ${getBreadcrumbTone(parkingNavStage, 'floor')}`}
            >
              Pisos
            </button>
            <button
              type="button"
              onClick={goToParkingZone}
              disabled={stageOrder[parkingNavStage] <= stageOrder.zone}
              className={`rounded-full px-3 py-1 transition ${getBreadcrumbTone(parkingNavStage, 'zone')}`}
            >
              Zonas
            </button>
            <span className={`rounded-full px-3 py-1 ${getBreadcrumbTone(parkingNavStage, 'space')}`}>Espacios</span>
          </div>

          {/* Aviso de conflicto: ya tienes parking propio en ese horario */}
          {parkingConflict ? (
            <div className="rounded-[2rem] border-2 border-purple-300 bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 px-5 py-4 text-purple-950 shadow-lg shadow-purple-500/10 ring-1 ring-purple-200/70 dark:border-purple-800 dark:from-purple-950/60 dark:via-slate-900 dark:to-purple-950/60 dark:text-purple-50 dark:ring-purple-900/40">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-purple-200 p-3 text-purple-800 shadow-sm dark:bg-purple-900/50 dark:text-purple-100">
                  <AlertTriangle size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black uppercase tracking-[0.25em] text-purple-700 dark:text-purple-200">
                    Ya tienes estacionamiento reservado
                  </p>
                  <p className="mt-1 text-[15px] font-bold leading-6 text-purple-950 dark:text-white">
                    Ya existe una reserva de estacionamiento propia que se traslapa con el horario seleccionado.
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-purple-800 dark:text-purple-100">
                    Cambia la fecha u horario para poder reservar otro espacio de parking.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Contenido por etapa */}
          {parkingConflict ? null : parkingNavStage === 'building' ? (
            parkingTree.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
                No hay edificios con estacionamiento disponibles.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {parkingTree.map((building) => {
                  const allSpcs = building.floors.flatMap((f) => f.zones.flatMap((z) => z.spaces));
                  const stats = getParkingNodeStats(allSpcs);
                  return (
                    <HierarchyCard
                      key={building.building_id}
                      icon={<Building2 size={18} />}
                      title={building.name}
                      subtitle={`${building.floors.length} piso(s) de parking`}
                      stats={stats}
                      accent={getNodeTone(stats)}
                      onClick={() => { setParkingBuildingId(building.building_id); setParkingFloorId(building.floors[0]?.floor_id ?? null); setParkingZoneId(building.floors[0]?.zones[0]?.zone_id ?? null); setParkingNavStage('floor'); }}
                    />
                  );
                })}
              </div>
            )
          ) : parkingNavStage === 'floor' && parkingSelectedBuilding ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {parkingSelectedBuilding.floors.map((floor) => {
                const allSpcs = floor.zones.flatMap((z) => z.spaces);
                const stats = getParkingNodeStats(allSpcs);
                return (
                  <HierarchyCard
                    key={floor.floor_id}
                    icon={<Car size={18} />}
                    title={`Piso ${floor.name}`}
                    subtitle={`${floor.zones.length} zona(s)`}
                    stats={stats}
                    accent={getNodeTone(stats)}
                    onClick={() => { setParkingFloorId(floor.floor_id); setParkingZoneId(floor.zones[0]?.zone_id ?? null); setParkingNavStage('zone'); }}
                  />
                );
              })}
            </div>
          ) : parkingNavStage === 'zone' && parkingSelectedFloor ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {parkingSelectedFloor.zones.map((zone) => {
                const stats = getParkingNodeStats(zone.spaces);
                return (
                  <HierarchyCard
                    key={zone.zone_id}
                    icon={<Layers3 size={18} />}
                    title={`Zona ${zone.name}`}
                    subtitle={`${zone.spaces.length} espacio(s)`}
                    stats={stats}
                    accent={getNodeTone(stats)}
                    onClick={() => { setParkingZoneId(zone.zone_id); setParkingNavStage('space'); }}
                  />
                );
              })}
            </div>
          ) : parkingNavStage === 'space' && parkingSelectedZone ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950/30">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Zona seleccionada</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Zona {parkingSelectedZone.name}</h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                  <Car size={14} />
                  Estacionamiento
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-2">
                {parkingSelectedZone.spaces.map((space) => {
                  const effectiveStatus = parkingStatusById.get(space.space_id) ?? space.status;
                  const isSelected = selectedParkingSpaceId === space.space_id;
                  return (
                    <button
                      key={space.space_id}
                      type="button"
                      onClick={() => setSelectedParkingSpaceId(isSelected ? null : space.space_id)}
                      className={`group relative h-24 rounded-2xl border text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl ${statusTone[effectiveStatus]} ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950' : ''}`}
                    >
                      <div className="flex h-full items-center justify-center px-2">
                        <div className="space-y-1">
                          <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                            Parking
                          </span>
                          <span className="block text-sm font-semibold leading-tight">{space.code}</span>
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">{statusLabel[effectiveStatus]}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white shadow-md">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
              Selecciona un edificio para comenzar.
            </div>
          )}
        </div>

        {/* Barra inferior de confirmación */}
        <div className="fixed bottom-24 left-4 right-4 z-40">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl bg-slate-950 px-4 py-3.5 text-white shadow-2xl shadow-slate-950/30 ring-1 ring-white/10 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/10 p-2.5 text-purple-400">
                <Car size={22} />
              </div>
              <div>
                <p className="text-base font-bold leading-none">
                  {selectedParkingSpace ? selectedParkingSpace.code : 'Sin espacio seleccionado'}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {selectedParkingSpace
                    ? `${parkingDate} · ${parkingStartTime} - ${parkingEndTime}`
                    : 'Navega el mapa y elige un espacio de parking'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInitStage('main')}
                className="rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Omitir
              </button>
              <button
                type="button"
                onClick={handleConfirmParking}
                disabled={confirmingParking}
                className="rounded-2xl bg-purple-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition hover:bg-purple-400 disabled:opacity-60"
              >
                {confirmingParking ? 'Reservando...' : selectedParkingSpace ? 'Confirmar estacionamiento' : 'Continuar sin parking'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950 to-purple-900 p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.35),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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

      {/* Botón para volver a elegir estacionamiento */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { setInitStage('parking-select'); setParkingNavStage('building'); setParkingBuildingId(null); setParkingFloorId(null); setParkingZoneId(null); setSelectedParkingSpaceId(null); }}
          className="inline-flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-100 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300 dark:hover:bg-purple-950/50"
        >
          <Car size={16} />
          Elegir estacionamiento
        </button>
      </div>

      {hiddenTypesMessage ? (
        <div className="rounded-[2rem] border-2 border-purple-300 bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 px-5 py-4 text-purple-950 shadow-lg shadow-purple-500/10 ring-1 ring-purple-200/70 dark:border-purple-800 dark:from-purple-950/60 dark:via-slate-900 dark:to-purple-950/60 dark:text-purple-50 dark:shadow-purple-950/30 dark:ring-purple-900/40">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-purple-200 p-3 text-purple-800 shadow-sm dark:bg-purple-900/50 dark:text-purple-100">
              <AlertTriangle size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black uppercase tracking-[0.25em] text-purple-700 dark:text-purple-200">
                Cards ocultas por reserva del mismo tipo
              </p>
              <p className="mt-1 text-[15px] font-bold leading-6 text-purple-950 dark:text-white">
                {hiddenTypesMessage}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-purple-800 dark:text-purple-100">
                Cambia el horario para volver a ver esas cards.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-purple-500 dark:border-slate-700 dark:bg-slate-950/40">
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

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-purple-500 dark:border-slate-700 dark:bg-slate-950/40">
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

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition focus-within:border-purple-500 dark:border-slate-700 dark:bg-slate-950/40">
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
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-purple-400" /> Libre</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-400" /> Ocupado</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-400" /> Mantenimiento</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" /> Bloqueado</span>
          <span className="ml-auto text-[11px] normal-case tracking-normal text-slate-400">
            {availabilityMessage}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
          <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">Desk</span>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">Meeting Room</span>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">Parking</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Espacio</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="normal-case tracking-normal text-slate-400">
              {isGuestMode ? 'Modo invitado activo' : 'Reservando para mí'}
            </span>
            <button
              type="button"
              onClick={() => { setIsGuestMode((v) => !v); setSelectedSpace(null); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isGuestMode ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isGuestMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {isGuestMode ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-300">
            <span className="font-semibold">Modo invitado:</span> se muestran todos los espacios aunque ya tengas uno reservado en este horario. El espacio que elijas se reservará para tu invitado.
          </div>
        ) : null}
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
          <button
            type="button"
            onClick={goToBuilding}
            disabled={stage === 'building'}
            className={`rounded-full px-3 py-1 transition ${getBreadcrumbTone(stage, 'building')}`}
          >
            Edificios
          </button>
          <button
            type="button"
            onClick={goToFloor}
            disabled={stageOrder[stage] <= stageOrder.floor}
            className={`rounded-full px-3 py-1 transition ${getBreadcrumbTone(stage, 'floor')}`}
          >
            Pisos
          </button>
          <button
            type="button"
            onClick={goToZone}
            disabled={stageOrder[stage] <= stageOrder.zone}
            className={`rounded-full px-3 py-1 transition ${getBreadcrumbTone(stage, 'zone')}`}
          >
            Zonas
          </button>
          <span className={`rounded-full px-3 py-1 ${getBreadcrumbTone(stage, 'space')}`}>Espacios</span>
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
              <div className="rounded-3xl border border-purple-200 bg-purple-50 px-4 py-4 text-purple-950 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-50">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-purple-100 p-2.5 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-700 dark:text-purple-200">Espacios ocultos</p>
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
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${selectedFloor?.floor_type === 'parking' ? 'bg-purple-100 text-purple-700' : 'bg-purple-100 text-purple-700'}`}>
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
                        className={`group relative h-24 rounded-2xl border text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl ${statusTone[effectiveStatus]} ${selected ? 'ring-2 ring-purple-600 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950' : ''}`}
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
                          <div className={`absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-white px-1.5 text-[10px] font-bold shadow-sm ${effectiveStatus === 'blocked' ? 'bg-slate-100 text-slate-600' : effectiveStatus === 'maintenance' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
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
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto z-50 w-auto sm:w-[min(92vw,22rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/20 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
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
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${isGuestMode ? 'bg-violet-600 hover:bg-violet-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {isGuestMode ? 'Reservar para invitado' : 'Reservar'}
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