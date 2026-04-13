import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Car, MapPin, User, Clock, MessageSquare, Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';

const rides = [
  { id: 1, driver: "Carlos Ruiz", from: "San Pedro", to: "Oficina Central", time: "08:30 AM", seats: 2, price: "Gratis", avatar: "CR" },
  { id: 2, driver: "Ana Torres", from: "Cumbres", to: "Oficina Central", time: "08:15 AM", seats: 1, price: "Gratis", avatar: "AT" },
  { id: 3, driver: "Miguel Ángel", from: "Carretera Nacional", to: "Oficina Central", time: "08:00 AM", seats: 3, price: "Gratis", avatar: "MA" },
];

export default function Carpool() {
  const [activeTab, setActiveTab] = useState<'find' | 'offer'>('find');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">WorkHub Carpool</h1>
          <p className="text-slate-500">Comparte tu viaje, reduce el tráfico y gana puntos.</p>
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
           <Car size={16} /> 250 pts por viaje
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('find')}
            className={clsx(
              "flex-1 py-4 text-center font-medium text-sm transition-colors",
              activeTab === 'find' ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600 dark:bg-slate-700 dark:text-blue-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            Buscar Viaje
          </button>
          <button 
            onClick={() => setActiveTab('offer')}
            className={clsx(
              "flex-1 py-4 text-center font-medium text-sm transition-colors",
              activeTab === 'offer' ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600 dark:bg-slate-700 dark:text-blue-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            Ofrecer Viaje
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'find' ? (
            <div className="space-y-6">
               <div className="flex gap-4">
                 <div className="flex-1 relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="¿Desde dónde sales?" 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
                 <button className="bg-blue-600 text-white px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                   <Search size={20} />
                 </button>
               </div>

               <div className="space-y-4">
                 <h3 className="font-semibold text-slate-900 dark:text-white">Viajes Disponibles para Hoy</h3>
                 {rides.map(ride => (
                   <motion.div 
                     key={ride.id}
                     whileHover={{ scale: 1.01 }}
                     className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:shadow-md transition-all"
                   >
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                          {ride.avatar}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">{ride.driver}</h4>
                          <div className="flex items-center text-sm text-slate-500 gap-2">
                             <span>{ride.from}</span>
                             <span className="text-slate-300">→</span>
                             <span>{ride.to}</span>
                          </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-sm">
                            <Clock size={14} /> {ride.time}
                          </div>
                          <div className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-1">
                            {ride.seats} asientos
                          </div>
                        </div>
                        <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
                          Solicitar
                        </button>
                     </div>
                   </motion.div>
                 ))}
               </div>
            </div>
          ) : (
            <div className="max-w-xl mx-auto py-4">
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Origen</label>
                   <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Tu dirección..." />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora de Salida</label>
                   <input type="time" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asientos Disponibles</label>
                   <div className="flex gap-4">
                     {[1, 2, 3, 4].map(num => (
                       <button key={num} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 hover:border-blue-500 focus:bg-blue-600 focus:text-white transition-all">
                         {num}
                       </button>
                     ))}
                   </div>
                 </div>
                 <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mt-4 flex items-center justify-center gap-2">
                   <Plus size={20} /> Publicar Viaje
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
