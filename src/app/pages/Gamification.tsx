import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Target, TrendingUp, Medal, Gift } from 'lucide-react';
import { clsx } from 'clsx';

const achievements = [
  { id: 1, title: "Madrugador", desc: "Check-in antes de las 8:00 AM 5 veces seguidas", icon: Target, color: "text-amber-500", bg: "bg-amber-100", progress: 80 },
  { id: 2, title: "Eco Warrior", desc: "Usaste Carpool 10 veces este mes", icon: Star, color: "text-green-500", bg: "bg-green-100", progress: 40 },
  { id: 3, title: "Planificador", desc: "Reservas confirmadas con 24h de antelación", icon: CalendarIcon, color: "text-blue-500", bg: "bg-blue-100", progress: 100, completed: true },
];

function CalendarIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
}

export default function Gamification() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mis Puntos y Logros</h1>
        <p className="text-slate-500">Gana recompensas por el buen uso de las instalaciones.</p>
      </div>

      {/* Main Score Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/30">
               <Trophy size={48} className="text-yellow-300" />
             </div>
             <div>
               <h2 className="text-4xl font-bold">1,250</h2>
               <p className="text-blue-100 font-medium">Puntos Totales</p>
               <div className="mt-2 inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs">
                 <TrendingUp size={12} /> Nivel 5: Experto
               </div>
             </div>
          </div>
          
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm min-w-[250px]">
             <div className="flex justify-between items-center mb-2 text-sm text-blue-100">
               <span>Próximo Nivel</span>
               <span>1,500 pts</span>
             </div>
             <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '75%' }}
                 transition={{ duration: 1, delay: 0.5 }}
                 className="h-full bg-yellow-400 rounded-full"
               />
             </div>
             <p className="text-xs mt-3 text-center text-blue-200">¡Solo te faltan 250 puntos!</p>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
      </motion.div>

      {/* Achievements Grid */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Logros Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {achievements.map((item) => (
             <motion.div 
               key={item.id}
               whileHover={{ y: -5 }}
               className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full"
             >
               <div className="flex justify-between items-start mb-4">
                 <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
                   <item.icon size={24} />
                 </div>
                 {item.completed && (
                   <div className="bg-yellow-100 text-yellow-600 p-1 rounded-full">
                     <Medal size={20} />
                   </div>
                 )}
               </div>
               
               <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{item.title}</h4>
               <p className="text-slate-500 text-sm mb-6 flex-1">{item.desc}</p>
               
               <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                 <div 
                   className={clsx("h-full rounded-full transition-all duration-1000", item.completed ? "bg-green-500" : "bg-blue-500")} 
                   style={{ width: `${item.progress}%` }} 
                 />
               </div>
               <div className="text-right mt-2 text-xs font-medium text-slate-400">
                 {item.progress}% completado
               </div>
             </motion.div>
           ))}
        </div>
      </div>

      {/* Rewards Shop Preview */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Gift className="text-purple-500" /> Canjear Puntos
          </h3>
          <button className="text-blue-600 text-sm font-medium hover:underline">Ver catálogo completo</button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
             <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
               <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-md mb-3 flex items-center justify-center text-slate-400">
                 Imagen
               </div>
               <p className="font-semibold text-sm text-slate-800 dark:text-white">Café Gratis</p>
               <p className="text-purple-600 text-xs font-bold">500 pts</p>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
