/*
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  MapPin, 
  Clock, 
  StopCircle,
  QrCode,
  Wifi
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

export default function CheckIn() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleToggleCheckIn = () => {
    setIsCheckedIn(!isCheckedIn);
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Registro de Asistencia</h1>
        <p className="text-slate-500 mt-2">Confirma tu llegada o salida del espacio de trabajo.</p>
      </div>

      <motion.div 
        layout
        className={clsx(
          "bg-white rounded-3xl shadow-xl overflow-hidden border transition-colors relative",
          isCheckedIn ? "border-emerald-500 shadow-emerald-200" : "border-slate-200"
        )}
      >
        <div className="p-8 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {!isCheckedIn ? (
              <motion.div 
                key="check-in-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <MapPin size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">¿Llegaste a la oficina?</h2>
                <p className="text-slate-500 text-center mb-8 max-w-xs">
                  Tienes una reserva activa para el <strong>Escritorio D-12</strong>.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl w-full mb-8 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="text-slate-400" />
                    <div className="text-left">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Código de Acceso</p>
                      <p className="font-mono text-lg font-bold text-slate-800 tracking-widest">WH-8842</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleCheckIn}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-3 text-lg"
                >
                  <CheckCircle size={24} />
                  <span>Realizar Check-in</span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="check-out-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50 animate-pulse">
                  <Clock size={48} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Sesión Activa</h2>
                <p className="text-emerald-600 font-medium mb-8">Escritorio D-12</p>

                <div className="text-5xl font-mono font-bold text-slate-800 mb-2 tracking-wider">
                  {formatTime(elapsedSeconds)}
                </div>
                <p className="text-slate-400 text-sm mb-8">Tiempo transcurrido</p>

                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-slate-50 p-3 rounded-lg flex flex-col items-center justify-center border border-slate-100">
                    <Wifi size={20} className="text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">WH-Guest</span>
                    <span className="text-[10px] text-slate-400">Red Wi-Fi</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex flex-col items-center justify-center border border-slate-100">
                    <MapPin size={20} className="text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">Piso 5</span>
                    <span className="text-[10px] text-slate-400">Ubicación</span>
                  </div>
                </div>

                <button
                  onClick={handleToggleCheckIn}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-xl border border-red-200 transition-all flex items-center justify-center gap-3"
                >
                  <StopCircle size={24} />
                  <span>Finalizar (Check-out)</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Decorative bottom bar *//*}
        <div className={clsx(
          "h-2 w-full transition-colors",
          isCheckedIn ? "bg-emerald-500" : "bg-blue-600"
        )} />
      </motion.div>
      
      <p className="text-center text-xs text-slate-400 mt-6 max-w-xs mx-auto">
        Recuerda realizar check-out al liberar tu espacio para que otros compañeros puedan utilizarlo.
      </p>
    </div>
  );
}
*/