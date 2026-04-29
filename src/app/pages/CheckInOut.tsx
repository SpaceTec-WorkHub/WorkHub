import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, LogIn, LogOut, Clock, MapPin, CheckCircle } from 'lucide-react';

export default function CheckInOut() {
  const [status, setStatus] = useState<'checked-out' | 'checked-in'>('checked-out');
  const [timer, setTimer] = useState(0);

  // Timer logic for demo
  useEffect(() => {
    let interval: any;
    if (status === 'checked-in') {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleStatus = () => {
    setStatus(prev => prev === 'checked-in' ? 'checked-out' : 'checked-in');
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Side: Status & Action */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Registro de Asistencia</h1>
            <p className="text-slate-500">Escanea el código QR de tu escritorio o usa el botón manual.</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl text-center relative overflow-hidden">
             
             {status === 'checked-in' && (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 className="absolute top-0 left-0 w-full h-1 bg-green-500"
               />
             )}

             <div className="mb-6">
               <span className={`inline-block p-4 rounded-full ${status === 'checked-in' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                 <Clock size={48} />
               </span>
             </div>

             <div className="mb-8">
               <p className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">Tiempo Transcurrido</p>
               <div className="text-5xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                 {formatTime(timer)}
               </div>
             </div>

             <motion.button
               whileTap={{ scale: 0.95 }}
               onClick={toggleStatus}
               className={`w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all ${
                 status === 'checked-out' 
                   ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                   : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none'
               }`}
             >
               {status === 'checked-out' ? (
                 <>
                   <LogIn size={24} />
                   Realizar Check-in
                 </>
               ) : (
                 <>
                   <LogOut size={24} />
                   Finalizar Sesión
                 </>
               )}
             </motion.button>

             {status === 'checked-in' && (
               <p className="mt-4 text-sm text-green-600 flex items-center justify-center gap-2">
                 <CheckCircle size={16} /> Estás activo en Escritorio Flex 402
               </p>
             )}
          </div>
        </div>

        {/* Right Side: QR & Map Context */}
        <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] border border-slate-200 dark:border-slate-800 relative">
           <div className="absolute top-6 left-6 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm text-xs font-medium text-slate-500">
             <MapPin size={12} className="inline mr-1" />
             Ubicación Actual
           </div>

           <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
             <QrCode size={180} className="text-slate-900" />
           </div>
           
           <p className="text-center text-slate-500 text-sm max-w-xs">
             Si estás en un escritorio, escanea el código QR físico para un registro automático y preciso.
           </p>
        </div>

      </div>
    </div>
  );
}
