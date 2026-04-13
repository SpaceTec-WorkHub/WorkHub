import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, CheckCircle, Search, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import 'react-day-picker/dist/style.css';

// Override default DayPicker styles with Tailwind classes
const css = `
  .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #2563eb; margin: 0; }
  .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #eff6ff; color: #2563eb; }
  .rdp-day_selected { background-color: #2563eb; color: white; }
`;

const timeSlots = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
  "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00",
  "16:00 - 17:00", "17:00 - 18:00"
];

const availableResources = [
  { id: 1, name: "Escritorio Flex 402", type: "Escritorio", capacity: 1, features: ["Monitor", "Silla Ergo"], available: true },
  { id: 2, name: "Sala Creativa A", type: "Sala", capacity: 6, features: ["TV", "Pizarrón", "VC"], available: true },
  { id: 3, name: "Estacionamiento S2-23", type: "Estacionamiento", capacity: 1, features: ["Cerca de elevador"], available: true },
  { id: 4, name: "Escritorio Flex 405", type: "Escritorio", capacity: 1, features: ["Ventana"], available: true },
];

export default function Reservation() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<number | null>(null);
  const [step, setStep] = useState(1); // 1: Select, 2: Confirm

  const handleConfirm = () => {
    setStep(2);
    setTimeout(() => {
      // Simulate API call
      // In a real app, this would navigate or reset
      alert("Reserva confirmada exitosamente!");
      setStep(1);
      setSelectedResource(null);
      setSelectedTime(null);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <style>{css}</style>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nueva Reserva</h1>
        <p className="text-slate-500">Selecciona fecha, hora y el recurso que necesitas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Filters & Calendar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CalendarIcon size={18} /> Fecha
            </h3>
            <div className="flex justify-center">
               <DayPicker
                 mode="single"
                 selected={date}
                 onSelect={setDate}
                 locale={es}
               />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock size={18} /> Horario
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={clsx(
                    "text-xs py-2 px-1 rounded-md border transition-all",
                    selectedTime === time 
                      ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                      : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent hover:bg-blue-50 hover:text-blue-600"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Results & Selection */}
        <div className="lg:col-span-8">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar sala o escritorio..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                <Filter size={16} /> Escritorios
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                <Filter size={16} /> Salas
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                <Filter size={16} /> Estacionamiento
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableResources.map((resource) => (
              <motion.div
                key={resource.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedResource(resource.id)}
                className={clsx(
                  "cursor-pointer p-6 rounded-xl border-2 transition-all shadow-sm flex flex-col justify-between h-48",
                  selectedResource === resource.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md ring-1 ring-blue-500"
                    : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-200 dark:hover:border-blue-800"
                )}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
                      {resource.type}
                    </span>
                    {resource.available && (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{resource.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Capacidad: {resource.capacity} persona(s)</p>
                </div>

                <div>
                   <div className="flex flex-wrap gap-2 mb-4">
                     {resource.features.map((feat) => (
                       <span key={feat} className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                         {feat}
                       </span>
                     ))}
                   </div>
                   {selectedResource === resource.id && (
                     <motion.div layoutId="check" className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                       <CheckCircle size={16} /> Seleccionado
                     </motion.div>
                   )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Floating Action Bar */}
          <div className="fixed bottom-6 right-6 lg:right-10 lg:left-72 z-40">
             <motion.div 
                initial={{ y: 100 }}
                animate={{ y: selectedResource && selectedTime && date ? 0 : 100 }}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-xl shadow-xl flex items-center justify-between max-w-2xl mx-auto w-full"
             >
               <div className="flex items-center gap-4">
                 <div className="bg-slate-800 dark:bg-slate-200 p-2 rounded-lg">
                   <CalendarIcon size={24} />
                 </div>
                 <div>
                   <p className="font-bold text-sm">Confirmar Reserva</p>
                   <p className="text-xs text-slate-400 dark:text-slate-500">
                     {date ? format(date, "PPP", { locale: es }) : ""} • {selectedTime}
                   </p>
                 </div>
               </div>
               <button 
                 onClick={handleConfirm}
                 className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all"
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
