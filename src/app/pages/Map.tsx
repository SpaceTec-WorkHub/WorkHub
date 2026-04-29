import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Monitor,
  Car,
  User,
  Clock,
  Calendar as CalendarIcon,
  ZoomIn,
  ZoomOut,
  Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { getSpace, ApiSpace } from '../../services/space';
import { createReservation } from '../../services/reservation';

// Types for our map items
type SpotStatus = 'available' | 'occupied' | 'reserved' | 'blocked';
type SpotType = 'desk' | 'parking';

interface Spot {
  id: string;
  type: SpotType;
  status: SpotStatus;
  label: string;
  zone: string;
}

// Generate some mock data
/*
const generateSpots = (type: SpotType, count: number): Spot[] => {
  return Array.from({ length: count }).map((_, i) => {
    const r = Math.random();
    let status: SpotStatus = 'available';
    if (r > 0.7) status = 'occupied';
    else if (r > 0.9) status = 'blocked';
    else if (r > 0.65 && r < 0.7) status = 'reserved'; // My reservation

    return {
      id: `${type}-${i}`,
      type,
      status,
      label: `${type === 'desk' ? 'D' : 'P'}-${i + 1}`,
      zone: i < count / 2 ? 'Zone A' : 'Zone B',
    };
  });
};

const desks = generateSpots('desk', 48);
const parkingSpots = generateSpots('parking', 30);
*/
export default function MapView() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'office' | 'parking'>('office');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [filterZone, setFilterZone] = useState<string>('all');

  const currentSpots = spots.filter((spot) =>
    activeTab === 'office' ? spot.type === 'desk' : spot.type === 'parking'
  );

  useEffect(() => {
    getSpace()
      .then((data) => {
        const mappedSpots: Spot[] = data.map((space) => ({
          id: String(space.space_id),
          type: space.space_type?.name?.toLowerCase().includes('parking')
            ? 'parking'
            : 'desk',
          status:
            space.status === 'maintenance'
              ? 'blocked'
              : (space.status as SpotStatus),
          label: space.code,
          zone: space.zone?.name || 'Sin zona',
        }));

        setSpots(mappedSpots);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSpotClick = (spot: Spot) => {
    if (spot.status === 'blocked' || spot.status === 'occupied') {
      toast.error(`El espacio ${spot.label} no está disponible.`);
      return;
    }

    setSelectedSpot(spot);
  };

  const handleReserve = async () => {
  if (!selectedSpot) return;

  try {
    await createReservation(Number(selectedSpot.id));
    toast.success(`¡Reserva confirmada para ${selectedSpot.label}!`);
    setSelectedSpot(null);
  } catch (err) {
    toast.error('No se pudo crear la reserva.');
    console.error(err);
  }
};

  if (loading) return <p>Cargando mapa...</p>;
  if (error) return <p>Error: {error}</p>;
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Controls Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('office')}
            className={clsx(
              "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'office' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Monitor size={18} />
            Oficina (Piso 5)
          </button>
          <button
            onClick={() => setActiveTab('parking')}
            className={clsx(
              "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              activeTab === 'parking' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Car size={18} />
            Estacionamiento
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar compañero..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
            <Filter size={20} />
          </button>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded-full"></span> Libre</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-full"></span> Ocupado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded-full"></span> Mío</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Map Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl relative overflow-hidden shadow-inner flex flex-col">
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button className="p-2 bg-white shadow-md border border-slate-100 rounded-lg text-slate-600 hover:text-blue-600">
              <ZoomIn size={20} />
            </button>
            <button className="p-2 bg-white shadow-md border border-slate-100 rounded-lg text-slate-600 hover:text-blue-600">
              <ZoomOut size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-8 bg-slate-50 flex items-center justify-center">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={clsx(
                "grid gap-4",
                activeTab === 'office' ? "grid-cols-8" : "grid-cols-6"
              )}
            >
              {currentSpots.map((spot) => (
                <motion.button
                  key={spot.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSpotClick(spot)}
                  className={clsx(
                    "relative rounded-lg flex items-center justify-center transition-colors shadow-sm border",
                    activeTab === 'office' ? "w-16 h-16" : "w-20 h-32",
                    spot.status === 'available' && "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700",
                    spot.status === 'occupied' && "bg-red-50 border-red-200 text-red-700 cursor-not-allowed",
                    spot.status === 'blocked' && "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed",
                    spot.status === 'reserved' && "bg-yellow-50 border-yellow-200 text-yellow-700 ring-2 ring-yellow-400",
                    selectedSpot?.id === spot.id && "ring-2 ring-blue-600 ring-offset-2 z-10"
                  )}
                >
                  <span className="font-semibold text-sm">{spot.label}</span>
                  {spot.status === 'occupied' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-100 text-blue-600 border border-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
                    </div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <AnimatePresence>
          {selectedSpot && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-6 flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {activeTab === 'office' ? 'Escritorio' : 'Cajón'} {selectedSpot.label}
                  </h3>
                  <p className="text-slate-500 text-sm">{selectedSpot.zone}</p>
                </div>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide">
                  Disponible
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-600">
                  <Monitor size={20} className="text-slate-400" />
                  <span className="text-sm">Monitor 27" 4K incluido</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={20} className="text-slate-400" />
                  <span className="text-sm">Disponible todo el día</span>
                </div>
                {activeTab === 'parking' && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Zap size={20} className="text-slate-400" />
                    <span className="text-sm">Cargador EV cercano</span>
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-3">
                <div className="text-xs text-slate-500 text-center mb-2">
                  Selecciona el horario
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button className="px-3 py-2 text-sm border border-blue-600 bg-blue-50 text-blue-700 rounded-lg font-medium">AM</button>
                  <button className="px-3 py-2 text-sm border border-slate-200 hover:border-blue-300 text-slate-600 rounded-lg">PM</button>
                </div>

                <button
                  onClick={handleReserve}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <CalendarIcon size={18} />
                  Confirmar Reserva
                </button>
                <button
                  onClick={() => setSelectedSpot(null)}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium text-sm"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
