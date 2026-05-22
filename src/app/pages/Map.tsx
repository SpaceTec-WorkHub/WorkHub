import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers3,
  Monitor,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  getBuildings,
  getFloors,
  getSpaces,
  getZones,
  BuildingRecord,
  FloorRecord,
  ZoneRecord,
} from '../../services/hierarchy';
import { ApiSpace } from '../../services/space';

type MapSpace = ApiSpace;
type MapZone = ZoneRecord & { spaces: MapSpace[] };
type MapFloor = FloorRecord & { zones: MapZone[] };
type MapBuilding = BuildingRecord & { floors: MapFloor[] };
type Stage = 'building' | 'floor' | 'zone' | 'space';

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const floorTypeLabel: Record<FloorRecord['floor_type'], string> = {
  office: 'Oficinas',
  parking: 'Estacionamiento',
};

const floorTypeIcon: Record<FloorRecord['floor_type'], React.ReactNode> = {
  office: <Monitor size={22} />,
  parking: <Car size={22} />,
};

const statusConfig: Record<
  MapSpace['status'],
  { cell: string; label: string }
> = {
  available: {
    cell: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 hover:-translate-y-0.5 hover:shadow-md shadow-sm cursor-pointer',
    label: 'Libre',
  },
  occupied: {
    cell: 'border-red-200 bg-red-50 text-red-700 cursor-not-allowed opacity-70',
    label: 'Ocupado',
  },
  maintenance: {
    cell: 'border-amber-200 bg-amber-50 text-amber-700 cursor-not-allowed opacity-70',
    label: 'Mantenimiento',
  },
  blocked: {
    cell: 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50',
    label: 'Bloqueado',
  },
};

const compareByName = (a: { name: string }, b: { name: string }) =>
  collator.compare(a.name, b.name);
const compareFloors = (a: FloorRecord, b: FloorRecord) => {
  if (a.floor_type !== b.floor_type) return a.floor_type === 'office' ? -1 : 1;
  return collator.compare(a.name, b.name);
};
const compareSpaces = (a: MapSpace, b: MapSpace) =>
  collator.compare(a.code, b.code);

// ─── Animation hook ──────────────────────────────────────────────────────────
// Injects keyframe once and returns a className that triggers on key change.
// No tailwind.config needed.

const KEYFRAME_ID = 'map-fade-slide';

function useGridAnimation(key: number) {
  useEffect(() => {
    if (!document.getElementById(KEYFRAME_ID)) {
      const style = document.createElement('style');
      style.id = KEYFRAME_ID;
      style.textContent = `
        @keyframes mapFadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);  }
        }
        .map-fade-slide {
          animation: mapFadeSlide 0.2s ease-out both;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Each time key changes we toggle a data attribute so the browser
  // re-runs the animation even if the element stays mounted.
  return key;
}

// ─── Cell components ──────────────────────────────────────────────────────────

const accentMap = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

interface MapCellProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  accent?: 'blue' | 'amber' | 'slate';
  selected?: boolean;
  onClick?: () => void;
}

function MapCell({ icon, label, sub, accent = 'blue', selected = false, onClick }: MapCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border text-center px-3',
        'transition-all duration-150 w-24 h-24',
        'border-slate-200 bg-white shadow-sm',
        'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md',
        'dark:border-slate-800 dark:bg-slate-900',
        selected ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white border-blue-300 dark:ring-offset-slate-900' : '',
      ].join(' ')}
    >
      <div className={`flex items-center justify-center rounded-xl p-1.5 ${accentMap[accent]}`}>
        {icon}
      </div>
      <div className="leading-tight w-full">
        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sub}</p>}
      </div>
      <ChevronRight size={11} className="absolute right-1.5 bottom-1.5 text-slate-300 dark:text-slate-600" />
    </button>
  );
}

function SpaceCell({
  space,
  selected,
  onClick,
}: {
  space: MapSpace;
  selected: boolean;
  onClick: () => void;
}) {
  const isAvailable = space.status === 'available';
  const cfg = statusConfig[space.status];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isAvailable}
      className={[
        'relative flex flex-col items-center justify-center gap-0.5 rounded-xl border text-center px-2',
        'transition-all duration-150 w-24 h-24',
        cfg.cell,
        selected && isAvailable
          ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
          : '',
      ].join(' ')}
    >
      <p className="text-sm font-semibold leading-tight">{space.code}</p>
      {space.space_type?.name && (
        <p className="text-[10px] opacity-60 truncate max-w-[76px]">{space.space_type.name}</p>
      )}
      {space.status === 'occupied' && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-blue-100 text-[9px] font-bold text-blue-600 shadow-sm dark:border-slate-900">
          G
        </div>
      )}
    </button>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

interface BreadcrumbItem { label: string; onClick?: () => void; active: boolean; }

function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 flex-wrap text-sm">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="text-slate-500 hover:text-blue-600 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:text-slate-400 dark:hover:text-blue-400"
            >
              {item.label}
            </button>
          ) : (
            <span className={item.active ? 'px-1.5 py-0.5 font-semibold text-slate-900 dark:text-white' : 'px-1.5 py-0.5 text-slate-400'}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MapView() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [floors, setFloors] = useState<FloorRecord[]>([]);
  const [zones, setZones] = useState<ZoneRecord[]>([]);
  const [spaces, setSpaces] = useState<MapSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<Stage>('building');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<MapSpace | null>(null);
  const [animKey, setAnimKey] = useState(0);

  useGridAnimation(animKey);
  const bumpAnim = () => setAnimKey((k) => k + 1);

  useEffect(() => {
    let mounted = true;
    Promise.all([getBuildings(), getFloors(), getZones(), getSpaces()])
      .then(([buildingData, floorData, zoneData, spaceData]) => {
        if (!mounted) return;
        setBuildings(buildingData ?? []);
        setFloors(floorData ?? []);
        setZones(zoneData ?? []);
        setSpaces(spaceData ?? []);
        setError('');
        const firstBuilding = buildingData?.[0] ?? null;
        const firstFloor = floorData.filter((f) => f.building_id === firstBuilding?.building_id).sort(compareFloors)[0] ?? null;
        const firstZone = zoneData.filter((z) => z.floor_id === firstFloor?.floor_id).sort(compareByName)[0] ?? null;
        setSelectedBuildingId(firstBuilding?.building_id ?? null);
        setSelectedFloorId(firstFloor?.floor_id ?? null);
        setSelectedZoneId(firstZone?.zone_id ?? null);
        setSelectedSpace(null);
        setStage('building');
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar el mapa.');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const tree = useMemo<MapBuilding[]>(() =>
    [...buildings].sort(compareByName).map((building) => ({
      ...building,
      floors: floors
        .filter((f) => f.building_id === building.building_id)
        .sort(compareFloors)
        .map((floor) => ({
          ...floor,
          zones: zones
            .filter((z) => z.floor_id === floor.floor_id)
            .sort(compareByName)
            .map((zone) => ({
              ...zone,
              spaces: spaces.filter((s) => s.zone_id === zone.zone_id).sort(compareSpaces),
            })),
        })),
    })),
    [buildings, floors, spaces, zones],
  );

  const selectedBuilding = useMemo(() => tree.find((b) => b.building_id === selectedBuildingId) ?? null, [selectedBuildingId, tree]);
  const selectedFloor = useMemo(() => selectedBuilding?.floors.find((f) => f.floor_id === selectedFloorId) ?? null, [selectedBuilding, selectedFloorId]);
  const selectedZone = useMemo(() => selectedFloor?.zones.find((z) => z.zone_id === selectedZoneId) ?? null, [selectedFloor, selectedZoneId]);
  const visibleSpaces = useMemo(() => selectedZone?.spaces ?? [], [selectedZone]);

  const goToBuilding = () => { setStage('building'); setSelectedFloorId(null); setSelectedZoneId(null); setSelectedSpace(null); bumpAnim(); };
  const goToFloor    = () => { setStage('floor');    setSelectedZoneId(null); setSelectedSpace(null); bumpAnim(); };
  const goToZone     = () => { setStage('zone');     setSelectedSpace(null); bumpAnim(); };

  const selectBuilding = (b: MapBuilding) => {
    setSelectedBuildingId(b.building_id);
    const ff = b.floors[0] ?? null;
    setSelectedFloorId(ff?.floor_id ?? null);
    setSelectedZoneId(ff?.zones[0]?.zone_id ?? null);
    setSelectedSpace(null);
    setStage('floor');
    bumpAnim();
  };
  const selectFloor = (f: MapFloor) => {
    setSelectedFloorId(f.floor_id);
    setSelectedZoneId(f.zones[0]?.zone_id ?? null);
    setSelectedSpace(null);
    setStage('zone');
    bumpAnim();
  };
  const selectZone = (z: MapZone) => {
    setSelectedZoneId(z.zone_id);
    setSelectedSpace(null);
    setStage('space');
    bumpAnim();
  };

  const handleSpaceClick = (space: MapSpace) => {
    if (space.status !== 'available') {
      toast.error(`El espacio ${space.code} no está disponible.`);
      return;
    }
    setSelectedSpace((prev) => (prev?.space_id === space.space_id ? null : space));
  };

  const handleReserve = () => {
    if (!selectedSpace) return;
    navigate('/reservation', { state: { spaceId: selectedSpace.space_id, spaceCode: selectedSpace.code } });
    toast.success(`Espacio ${selectedSpace.code} listo para reservar.`);
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Edificios', onClick: stage !== 'building' ? goToBuilding : undefined, active: stage === 'building' },
    ...(selectedBuilding ? [{ label: selectedBuilding.name, onClick: stage !== 'floor' ? goToFloor : undefined, active: stage === 'floor' }] : []),
    ...(selectedFloor && (stage === 'zone' || stage === 'space') ? [{ label: `Piso ${selectedFloor.name}`, onClick: stage !== 'zone' ? goToZone : undefined, active: stage === 'zone' }] : []),
    ...(selectedZone && stage === 'space' ? [{ label: `Zona ${selectedZone.name}`, onClick: undefined, active: true }] : []),
  ];

  const hintText: Record<Stage, string> = {
    building: 'Selecciona un edificio para ver sus pisos.',
    floor:    'Selecciona un piso para ver sus zonas.',
    zone:     'Selecciona una zona para ver sus espacios.',
    space:    'Toca un espacio libre para reservarlo.',
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        Cargando mapa...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <Breadcrumb items={breadcrumbItems} />
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hintText[stage]}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (stage === 'space') goToZone();
              else if (stage === 'zone') goToFloor();
              else if (stage === 'floor') goToBuilding();
            }}
            disabled={stage === 'building'}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={13} />
            Volver
          </button>
        </div>

        {/* ── Legend (only at space stage) ── */}
        {stage === 'space' && (
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800">
            {[
              { dot: 'bg-emerald-400', label: 'Libre' },
              { dot: 'bg-red-400',     label: 'Ocupado' },
              { dot: 'bg-amber-400',   label: 'Mantenimiento' },
              { dot: 'bg-slate-300',   label: 'Bloqueado' },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.dot}`} />
                {item.label}
              </span>
            ))}
          </div>
        )}

        {/* ── Grid canvas ── */}
        {/*
          KEY LAYOUT FIX:
          - Outer div is a flex container so the inner map area has a fixed
            minimum height and a light inset background — exactly like the
            original space map canvas.
          - Inner wrapper uses flex + flex-wrap + justify-center so cells
            always stay centered regardless of count (3 buildings, 5 floors, etc.)
          - Each cell has an explicit fixed size (w-24 h-24) so the flex layout
            is predictable and consistent at every stage.
        */}
        <div className="p-4">
          <div className="min-h-64 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950/30">
            <div
              key={animKey}
              className="map-fade-slide flex flex-wrap justify-center gap-3"
            >
              {stage === 'building' && tree.map((building) => (
                <MapCell
                  key={building.building_id}
                  icon={<Building2 size={22} />}
                  label={building.name}
                  sub={`${building.floors.length} piso(s)`}
                  accent="blue"
                  onClick={() => selectBuilding(building)}
                />
              ))}

              {stage === 'floor' && selectedBuilding?.floors.map((floor) => (
                <MapCell
                  key={floor.floor_id}
                  icon={floorTypeIcon[floor.floor_type]}
                  label={`Piso ${floor.name}`}
                  sub={floorTypeLabel[floor.floor_type]}
                  accent={floor.floor_type === 'parking' ? 'amber' : 'blue'}
                  onClick={() => selectFloor(floor)}
                />
              ))}

              {stage === 'zone' && selectedFloor?.zones.map((zone) => (
                <MapCell
                  key={zone.zone_id}
                  icon={<Layers3 size={22} />}
                  label={`Zona ${zone.name}`}
                  sub={`${zone.spaces.length} esp.`}
                  accent="slate"
                  onClick={() => selectZone(zone)}
                />
              ))}

              {stage === 'space' && visibleSpaces.map((space) => (
                <SpaceCell
                  key={space.space_id}
                  space={space}
                  selected={selectedSpace?.space_id === space.space_id}
                  onClick={() => handleSpaceClick(space)}
                />
              ))}

              {/* Empty state */}
              {((stage === 'building' && tree.length === 0) ||
                (stage === 'floor' && !selectedBuilding?.floors.length) ||
                (stage === 'zone' && !selectedFloor?.zones.length) ||
                (stage === 'space' && visibleSpaces.length === 0)) && (
                <div className="w-full rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950/30">
                  No hay elementos disponibles.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Selected space panel (fixed bottom-right) ── */}
      {selectedSpace && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/20 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Clock size={15} />
                <span className="text-xs font-semibold uppercase tracking-widest">Espacio seleccionado</span>
              </div>
              <h4 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{selectedSpace.code}</h4>
              {selectedSpace.space_type?.name && (
                <p className="text-sm text-slate-400">{selectedSpace.space_type.name}</p>
              )}
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
            {[
              { label: 'Estado',    value: statusConfig[selectedSpace.status].label },
              { label: 'Accesible', value: selectedSpace.is_accessible ? 'Sí' : 'No' },
              { label: 'Prioridad', value: selectedSpace.is_priority ? 'Sí' : 'No' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-slate-400">{item.label}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{item.value}</p>
              </div>
            ))}
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
      )}
    </div>
  );
}