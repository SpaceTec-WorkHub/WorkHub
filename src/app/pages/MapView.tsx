import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { clsx } from 'clsx';

// Mock data for spaces
const generateSpaces = (rows: number, cols: number) => {
  const spaces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `D-${r + 1}${String.fromCharCode(65 + c)}`;
      const status = Math.random() > 0.7 ? 'occupied' : Math.random() > 0.8 ? 'maintenance' : 'available';
      spaces.push({ id, r, c, status, type: 'desk' });
    }
  }
  return spaces;
};

const spaces = generateSpaces(6, 8);

export default function MapView() {
  const [selectedZone, setSelectedZone] = useState('Piso 4 - Norte');
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState('all'); // all, available, occupied

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const filteredSpaces = spaces.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Filters & Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Mapa de Espacios</h2>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button 
              onClick={() => setSelectedZone('Piso 4 - Norte')}
              className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-all", selectedZone === 'Piso 4 - Norte' ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")}
            >
              Piso 4 - Norte
            </button>
            <button 
               onClick={() => setSelectedZone('Piso 4 - Sur')}
               className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-all", selectedZone === 'Piso 4 - Sur' ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")}
            >
              Piso 4 - Sur
            </button>
            <button 
               onClick={() => setSelectedZone('Estacionamiento')}
               className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-all", selectedZone === 'Estacionamiento' ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")}
            >
              Estacionamiento
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
             <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
               <span className="text-xs text-slate-600 dark:text-slate-400">Libre</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
               <span className="text-xs text-slate-600 dark:text-slate-400">Ocupado</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded-full bg-amber-400"></div>
               <span className="text-xs text-slate-600 dark:text-slate-400">Mantenimiento</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={handleZoomOut} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
              <ZoomOut size={18} />
            </button>
            <button onClick={handleZoomIn} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Map Visualization */}
      <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner flex items-center justify-center p-8">
        
        {/* Mock Floor Plan Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ 
          backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
        }}></div>

        <motion.div 
          className="relative bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
          style={{ scale: zoom }}
          drag
          dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
            {spaces.map((space) => {
               const isFiltered = filter === 'all' || space.status === filter;
               return (
                 <motion.div
                   key={space.id}
                   whileHover={{ scale: 1.1, zIndex: 10 }}
                   className={clsx(
                     "w-16 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors relative group",
                     space.status === 'available' ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-500" :
                     space.status === 'occupied' ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed" :
                     "border-amber-200 bg-amber-50 text-amber-700"
                   )}
                 >
                   {space.id}
                   {space.status === 'available' && (
                     <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                   )}
                   
                   {/* Tooltip */}
                   <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-slate-900 text-white text-xs rounded-md py-1 px-2 opacity-0 group-hover:opacity-100 pointer-events-none z-20 text-center shadow-lg">
                     {space.status === 'available' ? 'Disponible' : space.status === 'occupied' ? 'Ocupado por Ana' : 'En Mantenimiento'}
                     <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                   </div>
                 </motion.div>
               )
            })}
          </div>
          
          {/* Walls / Structure (Visual Decorations) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-32 h-2 bg-slate-300 rounded-full"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 w-32 h-2 bg-slate-300 rounded-full"></div>
        </motion.div>

        {/* Legend Overlay for Selection */}
        <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg max-w-xs">
          <h4 className="font-bold text-slate-800 dark:text-white mb-2">Detalles del Espacio</h4>
          <p className="text-sm text-slate-500 mb-3">Selecciona un espacio verde para ver detalles y reservar.</p>
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Reservar Rápido</button>
          </div>
        </div>
      </div>
    </div>
  );
}
