import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocation, useNavigate } from 'react-router';
import { Building2, Car, ChevronLeft, ChevronRight, Layers3, Map as MapIcon, Sparkles, X } from 'lucide-react';
import { clsx } from 'clsx';
import { getCurrentUserId } from '../../services/auth';
import { ApiSpace, getSpace } from '../../services/space';
import { createReservation, getReservationSpaces } from '../../services/reservation';
import { useToast } from '../components/feedback/ToastProvider';

// ── Tipos para el panel de parking ───────────────────────────────────────────

type ParkingPanelStage = 'building' | 'floor' | 'zone' | 'space';

interface ParkingBuilding {
  id: number;
  name: string;
  floors: ParkingFloor[];
}

interface ParkingFloor {
  key: string;
  name: string;
  zones: ParkingZone[];
}

interface ParkingZone {
  key: string;
  name: string;
  spaces: ApiSpace[];
}

// ── Utilidades ────────────────────────────────────────────────────────────────

const isParkingSpace = (space: { space_type?: { name?: string } | null | undefined }) =>
  (space.space_type?.name ?? '').toLowerCase().includes('parking');

const isRoomSpace = (space: { space_type?: { name?: string } | null | undefined }) => {
  const name = (space.space_type?.name ?? '').toLowerCase();
  return name.includes('room') || name.includes('sala') || name.includes('meeting') || name.includes('juntas');
};

const buildLocalDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const buildParkingTree = (allSpaces: ApiSpace[]): ParkingBuilding[] => {
  const parkingSpaces = allSpaces.filter(isParkingSpace);
  const buildingMap = new Map<number, { name: string; floorMap: Map<string, Map<string, ApiSpace[]>> }>();

  for (const space of parkingSpaces) {
    const building = space.zone?.floor?.building;
    if (!building) continue;
    const { building_id, name: buildingName } = building;
    const floorName = space.zone?.floor?.name ?? 'Planta';
    const zoneName = space.zone?.name ?? 'General';

    if (!buildingMap.has(building_id)) buildingMap.set(building_id, { name: buildingName, floorMap: new Map() });
    const bEntry = buildingMap.get(building_id)!;
    if (!bEntry.floorMap.has(floorName)) bEntry.floorMap.set(floorName, new Map());
    const fEntry = bEntry.floorMap.get(floorName)!;
    if (!fEntry.has(zoneName)) fEntry.set(zoneName, []);
    fEntry.get(zoneName)!.push(space);
  }

  return Array.from(buildingMap.entries())
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .map(([id, { name, floorMap }]) => ({
      id,
      name,
      floors: Array.from(floorMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([floorName, zoneMap]) => ({
          key: floorName,
          name: floorName,
          zones: Array.from(zoneMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([zoneName, spaces]) => ({
              key: zoneName,
              name: zoneName,
              spaces: spaces.sort((a, b) => (a.code || '').localeCompare(b.code || '')),
            })),
        })),
    }));
};

function getReservationContext(search: string, state: unknown) {
  const searchParams = new URLSearchParams(search);
  const navigationState = state && typeof state === 'object' ? (state as Record<string, unknown>) : {};

  const readPositiveNumber = (...values: unknown[]) => {
    for (const value of values) {
      const parsedValue = Number(value);
      if (Number.isFinite(parsedValue) && parsedValue > 0) return parsedValue;
    }
    return null;
  };

  const readString = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) return value;
    }
    return null;
  };

  return {
    eventId: readPositiveNumber(navigationState.eventId, navigationState.event_id, searchParams.get('event_id')),
    date: readString(navigationState.date, navigationState.selectedDate, searchParams.get('date')),
    startTime: readString(navigationState.startTime, navigationState.start_time, searchParams.get('start_time')),
    endTime: readString(navigationState.endTime, navigationState.end_time, searchParams.get('end_time')),
    spaceId: readPositiveNumber(navigationState.spaceId, navigationState.space_id, navigationState.selectedSpaceId, searchParams.get('space_id')),
    spaceCode: readString(navigationState.spaceCode, navigationState.code, navigationState.selectedSpaceCode),
    isGuestReservation: navigationState.isGuestReservation === true,
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
  if (!year || !month || !day) return null;
  const parsedDate = new Date(year, month - 1, day);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

// ── Panel flotante de selección de parking ────────────────────────────────────

const parkingSpaceStatusLabel: Record<ApiSpace['status'], string> = {
  available: 'Libre',
  occupied: 'Ocupado',
  maintenance: 'Mant.',
  blocked: 'Bloqueado',
};

interface ParkingMapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedParkingId?: number;
  allSpaces: ApiSpace[];
  /** IDs de espacios realmente disponibles para el horario. undefined = no cargado (muestra status estático). */
  availableSpaceIds?: Set<number>;
  /** IDs ya elegidos por otros invitados en el mismo formulario — se muestran como ocupados. */
  takenSpaceIds?: Set<number>;
  onSelectParking: (spaceId: number) => void;
}

function ParkingMapPanel({ isOpen, onClose, selectedParkingId, allSpaces, availableSpaceIds, takenSpaceIds, onSelectParking }: ParkingMapPanelProps) {
  const [stage, setStage] = useState<ParkingPanelStage>('building');
  const [selectedBuilding, setSelectedBuilding] = useState<ParkingBuilding | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<ParkingFloor | null>(null);
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null);

  const tree = useMemo(() => buildParkingTree(allSpaces), [allSpaces]);

  useEffect(() => {
    if (isOpen) {
      setStage('building');
      setSelectedBuilding(null);
      setSelectedFloor(null);
      setSelectedZone(null);
    }
  }, [isOpen]);

  const handleBack = () => {
    if (stage === 'space') { setStage('zone'); setSelectedZone(null); }
    else if (stage === 'zone') { setStage('floor'); setSelectedFloor(null); }
    else if (stage === 'floor') { setStage('building'); setSelectedBuilding(null); }
  };

  const nodeCardClass = 'group rounded-3xl border border-purple-200 bg-purple-50 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-purple-900/30 dark:bg-purple-950/20';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-[min(96vw,640px)] max-h-[85vh] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-slate-900">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
              <Car size={13} />
              Estacionamientos
            </div>
            <h2 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">Seleccionar espacio de parking</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          {stage !== 'building' && (
            <button type="button" onClick={handleBack} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200">
              <ChevronLeft size={14} />
              Volver
            </button>
          )}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            <button type="button" className={clsx('rounded-full px-2.5 py-1', stage === 'building' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')} onClick={() => { setStage('building'); setSelectedBuilding(null); setSelectedFloor(null); setSelectedZone(null); }}>Edificios</button>
            {selectedBuilding && (<><span className="text-slate-300">›</span><button type="button" className={clsx('rounded-full px-2.5 py-1', stage === 'floor' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')} onClick={() => { setStage('floor'); setSelectedFloor(null); setSelectedZone(null); }}>{selectedBuilding.name}</button></>)}
            {selectedFloor && (<><span className="text-slate-300">›</span><button type="button" className={clsx('rounded-full px-2.5 py-1', stage === 'zone' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')} onClick={() => { setStage('zone'); setSelectedZone(null); }}>Piso {selectedFloor.name}</button></>)}
            {selectedZone && stage === 'space' && (<><span className="text-slate-300">›</span><span className="rounded-full bg-purple-600 px-2.5 py-1 text-white">Zona {selectedZone.name}</span></>)}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {tree.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No hay espacios de estacionamiento disponibles.</div>
          ) : stage === 'building' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {tree.map((building) => {
                const all = building.floors.flatMap((f) => f.zones.flatMap((z) => z.spaces));
                const available = all.filter((s) => {
                  if (takenSpaceIds?.has(s.space_id)) return false;
                  return availableSpaceIds !== undefined ? availableSpaceIds.has(s.space_id) : s.status === 'available';
                }).length;
                return (
                  <button key={building.id} type="button" onClick={() => { setSelectedBuilding(building); setStage('floor'); }} className={nodeCardClass}>
                    <div className="mb-3 flex items-center gap-3"><div className="rounded-2xl bg-purple-100 p-2.5 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"><Building2 size={18} /></div><ChevronRight size={18} className="ml-auto text-slate-300 transition group-hover:translate-x-1 group-hover:text-purple-500" /></div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{building.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{building.floors.length} piso(s)</p>
                    <div className="mt-3 flex gap-2 text-[11px] font-semibold"><span className="rounded-full bg-white/80 px-2.5 py-1 text-purple-700 dark:bg-slate-950/70">{available} libres</span><span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-600 dark:bg-slate-950/70">{all.length - available} no libres</span></div>
                  </button>
                );
              })}
            </div>
          ) : stage === 'floor' && selectedBuilding ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedBuilding.floors.map((floor) => {
                const all = floor.zones.flatMap((z) => z.spaces);
                const available = all.filter((s) => {
                  if (takenSpaceIds?.has(s.space_id)) return false;
                  return availableSpaceIds !== undefined ? availableSpaceIds.has(s.space_id) : s.status === 'available';
                }).length;
                return (
                  <button key={floor.key} type="button" onClick={() => { setSelectedFloor(floor); setStage('zone'); }} className={nodeCardClass}>
                    <div className="mb-3 flex items-center gap-3"><div className="rounded-2xl bg-purple-100 p-2.5 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"><Car size={18} /></div><ChevronRight size={18} className="ml-auto text-slate-300 transition group-hover:translate-x-1 group-hover:text-purple-500" /></div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Piso {floor.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{floor.zones.length} zona(s)</p>
                    <div className="mt-3 flex gap-2 text-[11px] font-semibold"><span className="rounded-full bg-white/80 px-2.5 py-1 text-purple-700 dark:bg-slate-950/70">{available} libres</span><span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-600 dark:bg-slate-950/70">{all.length - available} no libres</span></div>
                  </button>
                );
              })}
            </div>
          ) : stage === 'zone' && selectedFloor ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedFloor.zones.map((zone) => {
                const available = zone.spaces.filter((s) => {
                  if (takenSpaceIds?.has(s.space_id)) return false;
                  return availableSpaceIds !== undefined ? availableSpaceIds.has(s.space_id) : s.status === 'available';
                }).length;
                return (
                  <button key={zone.key} type="button" onClick={() => { setSelectedZone(zone); setStage('space'); }} className={nodeCardClass}>
                    <div className="mb-3 flex items-center gap-3"><div className="rounded-2xl bg-purple-100 p-2.5 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"><Layers3 size={18} /></div><ChevronRight size={18} className="ml-auto text-slate-300 transition group-hover:translate-x-1 group-hover:text-purple-500" /></div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Zona {zone.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{zone.spaces.length} espacio(s)</p>
                    <div className="mt-3 flex gap-2 text-[11px] font-semibold"><span className="rounded-full bg-white/80 px-2.5 py-1 text-purple-700 dark:bg-slate-950/70">{available} libres</span><span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-600 dark:bg-slate-950/70">{zone.spaces.length - available} no libres</span></div>
                  </button>
                );
              })}
            </div>
          ) : stage === 'space' && selectedZone ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{selectedZone.spaces.length} espacio(s) · Zona {selectedZone.name}</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {selectedZone.spaces.map((space) => {
                  const effectiveStatus: ApiSpace['status'] =
                    space.status === 'maintenance' || space.status === 'blocked'
                      ? space.status
                      : takenSpaceIds?.has(space.space_id)
                        ? 'occupied'
                        : availableSpaceIds !== undefined
                          ? (availableSpaceIds.has(space.space_id) ? 'available' : 'occupied')
                          : space.status;
                  const isAvailable = effectiveStatus === 'available';
                  const isSelected = selectedParkingId === space.space_id;
                  return (
                    <button
                      key={space.space_id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => { onSelectParking(space.space_id); onClose(); }}
                      className={clsx(
                        'relative flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition-all duration-200',
                        isAvailable ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : 'cursor-not-allowed',
                        effectiveStatus === 'available' ? 'border-purple-200 bg-purple-50 text-purple-800'
                          : effectiveStatus === 'occupied' ? 'border-red-200 bg-red-50 text-red-700 opacity-70'
                          : effectiveStatus === 'maintenance' ? 'border-blue-200 bg-blue-50 text-blue-700 opacity-70'
                          : 'border-slate-200 bg-slate-100 text-slate-500 opacity-60',
                        isSelected && 'ring-2 ring-purple-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                      )}
                    >
                      <span className="text-sm font-bold leading-tight">{space.code}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-70">{parkingSpaceStatusLabel[effectiveStatus]}</span>
                      {isSelected && <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[9px] font-bold text-white shadow-sm">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-700"><span className="h-2.5 w-2.5 rounded-full bg-purple-400" /> Libre</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Ocupado</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Mantenimiento</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Bloqueado</span>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Reservation() {
  const navigate = useNavigate();
  const location = useLocation();

  const reservationContext = useMemo(
    () => getReservationContext(location.search, location.state),
    [location.search, location.state],
  );

  const summaryMode = Boolean(reservationContext.spaceId);

  const [date] = useState<Date | undefined>(() => {
    if (reservationContext.date) {
      const parsed = parseLocalDateOnly(reservationContext.date);
      if (parsed) return parsed;
    }
    return new Date();
  });

  const [allSpaces, setAllSpaces] = useState<ApiSpace[]>([]);
  const toast = useToast();
  const [guests, setGuests] = useState<{ name: string; email?: string; extra_parking_space_id?: number }[]>([]);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [parkingPanelGuestIdx, setParkingPanelGuestIdx] = useState<number | null>(null);
  const [parkingAvailableIds, setParkingAvailableIds] = useState<Set<number> | undefined>(undefined);

  // Estado para reserva de invitado (isGuestReservation)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestParkingSpaceId, setGuestParkingSpaceId] = useState<number | null>(null);
  const [showGuestParkingPanel, setShowGuestParkingPanel] = useState(false);

  const currentUserId = useMemo(() => getCurrentUserId(), []);

  useEffect(() => {
    if (!currentUserId) {
      navigate('/login', { replace: true });
    }
  }, [currentUserId, navigate]);

  useEffect(() => {
    let mounted = true;
    getSpace()
      .then((data) => { if (mounted) setAllSpaces(data ?? []); })
      .catch(() => { if (mounted) setAllSpaces([]); });
    return () => { mounted = false; };
  }, []);

  // Fetch disponibilidad real de parking para el horario de la reserva
  useEffect(() => {
    if (!summaryMode) return;
    const dateStr = reservationContext.date;
    const start = normalizeToHHMM(reservationContext.startTime);
    const end = normalizeToHHMM(reservationContext.endTime);
    if (!dateStr || !start || !end) return;

    let mounted = true;
    getReservationSpaces(dateStr, start, end)
      .then((available) => {
        if (!mounted) return;
        const ids = new Set(available.filter(isParkingSpace).map((s) => s.space_id));
        setParkingAvailableIds(ids);
      })
      .catch(() => { if (mounted) setParkingAvailableIds(new Set()); });
    return () => { mounted = false; };
  }, [summaryMode, reservationContext.date, reservationContext.startTime, reservationContext.endTime]);

  // ── Sin selección desde el mapa ───────────────────────────────────────────

  if (!summaryMode) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white flex items-center justify-center p-4">
        <div className="w-[min(96vw,480px)] space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl text-center dark:border-slate-800 dark:bg-slate-800">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-200">
            <MapIcon size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Selecciona un espacio desde el mapa</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Para confirmar una reserva primero debes elegir el espacio que quieres apartar desde el mapa interactivo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Ir al mapa
          </button>
        </div>
      </div>
    );
  }

  // ── Confirmación de reserva ───────────────────────────────────────────────

  const handleConfirm = async () => {
    const startTime = reservationContext.startTime;
    const endTime = reservationContext.endTime;

    if (!date || !reservationContext.spaceId || !startTime || !endTime) {
      toast.error('Faltan datos de la reserva. Vuelve al mapa y selecciona el espacio.');
      return;
    }

    // Reserva de invitado: requiere nombre
    if (reservationContext.isGuestReservation) {
      if (!guestName.trim()) {
        toast.error('El nombre del invitado es obligatorio.');
        return;
      }
      try {
        await createReservation({
          start_time: buildLocalDateTime(date, normalizeToHHMM(startTime) ?? startTime).toISOString(),
          end_time: buildLocalDateTime(date, normalizeToHHMM(endTime) ?? endTime).toISOString(),
          space_id: reservationContext.spaceId,
          is_guest_reservation: true,
          guests: [{ name: guestName.trim(), email: guestEmail.trim() || undefined, extra_parking_space_id: guestParkingSpaceId ?? undefined }],
        });
        toast.success(`Reserva para ${guestName.trim()} confirmada en ${reservationContext.spaceCode ?? 'el espacio seleccionado'}.`);
        setTimeout(() => navigate('/reservations'), 900);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No fue posible confirmar la reserva.');
      }
      return;
    }

    // Reserva propia
    const validGuests = guests.filter((g) => g.name && g.name.trim().length > 0);
    if (guests.length > 0 && validGuests.length !== guests.length) {
      toast.error('Todos los invitados deben tener un nombre.');
      return;
    }

    try {
      await createReservation({
        start_time: buildLocalDateTime(date, normalizeToHHMM(startTime) ?? startTime).toISOString(),
        end_time: buildLocalDateTime(date, normalizeToHHMM(endTime) ?? endTime).toISOString(),
        space_id: reservationContext.spaceId,
        ...(reservationContext.eventId ? { event_id: reservationContext.eventId } : {}),
        ...(validGuests.length > 0 ? { guests: validGuests } : {}),
      });

      toast.success(`Reserva confirmada para ${reservationContext.spaceCode ?? 'el espacio seleccionado'}.`);
      setTimeout(() => navigate('/reservations'), 900);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible confirmar la reserva.');
    }
  };

  const spaceFromContext = allSpaces.find((s) => s.space_id === reservationContext.spaceId);
  const isRoom = spaceFromContext ? isRoomSpace(spaceFromContext) : false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-5 lg:px-6">
        <div className="w-full space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">

          {/* Título */}
          <div>
            {reservationContext.isGuestReservation ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                <Sparkles size={14} />
                Reserva para invitado
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-[11px] font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                <Sparkles size={14} />
                Confirmación de reserva
              </div>
            )}
            <h1 className="mt-3 text-[1.7rem] font-bold tracking-tight sm:text-3xl">
              {reservationContext.isGuestReservation ? 'Reserva para un invitado' : 'Resumen de la reservación'}
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] text-slate-600 dark:text-slate-400">
              {reservationContext.isGuestReservation
                ? 'Ingresa los datos del invitado y confirma el espacio reservado para él.'
                : 'Revisa los datos y confirma tu reserva.'}
            </p>
          </div>

          {/* Datos de la reserva */}
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
                  ? `${normalizeToHHMM(reservationContext.startTime) ?? reservationContext.startTime} – ${normalizeToHHMM(reservationContext.endTime) ?? reservationContext.endTime}`
                  : 'Sin elegir'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Espacio</p>
              <p className="mt-1 text-[13px] font-semibold">{reservationContext.spaceCode ?? 'Sin elegir'}</p>
            </div>
          </div>

          {/* Formulario de datos del invitado (modo reserva para invitado) */}
          {reservationContext.isGuestReservation ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Datos del invitado</p>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="Nombre completo *"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="Correo electrónico (opcional)"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
              <div>
                <p className="mb-1.5 text-xs text-slate-500">Estacionamiento para el invitado (opcional)</p>
                <button
                  type="button"
                  onClick={() => setShowGuestParkingPanel(true)}
                  className="w-full flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm transition hover:bg-purple-100 dark:border-purple-900/40 dark:bg-purple-950/20"
                >
                  <Car size={15} className="shrink-0 text-purple-600" />
                  <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-200">
                    {guestParkingSpaceId
                      ? (allSpaces.find((s) => s.space_id === guestParkingSpaceId)?.code ?? 'Espacio seleccionado')
                      : 'Seleccionar estacionamiento...'}
                  </span>
                  <ChevronRight size={15} className="text-slate-400" />
                </button>
                {guestParkingSpaceId && (
                  <button
                    type="button"
                    onClick={() => setGuestParkingSpaceId(null)}
                    className="mt-1 text-xs text-slate-400 hover:text-red-500"
                  >
                    Quitar estacionamiento
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Invitados (solo salas, modo reserva propia) */}
          {!reservationContext.isGuestReservation && isRoom ? (
            <div>
              <p className="text-sm font-semibold">Invitados <span className="font-normal text-slate-400">(solo para salas · opcional)</span></p>

              {showGuestForm ? (
                <div className="mt-3 space-y-3">
                  {guests.map((g, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 dark:border-slate-700 dark:bg-slate-900/60">
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          placeholder="Nombre *"
                          value={g.name}
                          onChange={(e) => setGuests((prev) => { const next = [...prev]; next[idx] = { ...next[idx], name: e.target.value }; return next; })}
                        />
                        <button type="button" onClick={() => setGuests((prev) => prev.filter((_, i) => i !== idx))} className="text-sm font-semibold text-red-600 hover:text-red-700">Eliminar</button>
                      </div>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder="Email (opcional)"
                        value={g.email ?? ''}
                        onChange={(e) => setGuests((prev) => { const next = [...prev]; next[idx] = { ...next[idx], email: e.target.value }; return next; })}
                      />
                      <div>
                        <p className="mb-1.5 text-xs text-slate-500">Estacionamiento extra (opcional)</p>
                        <button
                          type="button"
                          onClick={() => setParkingPanelGuestIdx(idx)}
                          className="w-full flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm transition hover:bg-purple-100 dark:border-purple-900/40 dark:bg-purple-950/20"
                        >
                          <Car size={15} className="shrink-0 text-purple-600" />
                          <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-200">
                            {g.extra_parking_space_id
                              ? (allSpaces.find((s) => s.space_id === g.extra_parking_space_id)?.code ?? 'Espacio seleccionado')
                              : 'Seleccionar estacionamiento...'}
                          </span>
                          <ChevronRight size={15} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setGuests((prev) => [...prev, { name: '', email: '' }])} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600">
                      + Agregar invitado
                    </button>
                    <button type="button" onClick={() => setShowGuestForm(false)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700">
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-sm text-slate-500">
                    {guests.length > 0 ? `${guests.length} invitado(s) añadido(s).` : 'Sin invitados añadidos.'}
                  </p>
                  <button type="button" onClick={() => setShowGuestForm(true)} className="rounded-2xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700">
                    {guests.length > 0 ? 'Editar invitados' : 'Añadir invitados'}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Evento vinculado (solo reservas propias) */}
          {!reservationContext.isGuestReservation && reservationContext.eventId ? (
            <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-[13px] text-purple-700">
              Reserva vinculada al evento #{reservationContext.eventId}.
            </div>
          ) : null}

          {/* Acciones */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => navigate('/map')} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
              Volver al mapa
            </button>
            <button type="button" onClick={handleConfirm} className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700">
              Confirmar reserva
            </button>
          </div>
        </div>
      </div>

      {/* Panel de parking para el invitado (modo reserva para invitado) */}
      <ParkingMapPanel
        isOpen={showGuestParkingPanel}
        onClose={() => setShowGuestParkingPanel(false)}
        selectedParkingId={guestParkingSpaceId ?? undefined}
        allSpaces={allSpaces}
        availableSpaceIds={parkingAvailableIds}
        onSelectParking={(spaceId) => {
          setGuestParkingSpaceId(spaceId);
          setShowGuestParkingPanel(false);
        }}
      />

      {/* Panel de parking para invitados de sala */}
      <ParkingMapPanel
        isOpen={parkingPanelGuestIdx !== null}
        onClose={() => setParkingPanelGuestIdx(null)}
        selectedParkingId={parkingPanelGuestIdx !== null ? guests[parkingPanelGuestIdx]?.extra_parking_space_id : undefined}
        allSpaces={allSpaces}
        availableSpaceIds={parkingAvailableIds}
        takenSpaceIds={
          parkingPanelGuestIdx !== null
            ? new Set(
                guests
                  .filter((_, i) => i !== parkingPanelGuestIdx)
                  .map((g) => g.extra_parking_space_id)
                  .filter((id): id is number => id != null),
              )
            : undefined
        }
        onSelectParking={(spaceId) => {
          if (parkingPanelGuestIdx === null) return;
          setGuests((prev) => {
            const next = [...prev];
            next[parkingPanelGuestIdx] = { ...next[parkingPanelGuestIdx], extra_parking_space_id: spaceId };
            return next;
          });
          setParkingPanelGuestIdx(null);
        }}
      />
    </div>
  );
}
