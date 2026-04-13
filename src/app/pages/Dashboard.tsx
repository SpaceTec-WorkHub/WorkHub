import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Car, 
  Clock, 
  TrendingUp, 
  MapPin, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Lun', ocupacion: 65 },
  { name: 'Mar', ocupacion: 80 },
  { name: 'Mie', ocupacion: 95 },
  { name: 'Jue', ocupacion: 85 },
  { name: 'Vie', ocupacion: 45 },
];

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, trend }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
    <p className="text-xs text-slate-400 mt-2">{subtext}</p>
  </motion.div>
);

const RecommendationCard = ({ title, desc, time, type }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
    <div className={`p-2 rounded-full ${type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
      {type === 'warning' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
    </div>
    <div>
      <h4 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
      <span className="text-xs text-slate-400 mt-2 block">{time}</span>
    </div>
  </div>
);

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buenos días, Juan</h1>
          <p className="text-slate-500 dark:text-slate-400">Aquí tienes el resumen de hoy, 28 de Febrero, 2026.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Ver Reportes
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 dark:shadow-none">
            Reservar Espacio
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Escritorios Disponibles" 
          value="42" 
          subtext="De 150 totales en piso 4"
          icon={Users}
          colorClass="bg-blue-500 text-blue-600"
          trend={12}
        />
        <StatCard 
          title="Estacionamiento" 
          value="15" 
          subtext="Lugares libres en Sótano 2"
          icon={Car}
          colorClass="bg-indigo-500 text-indigo-600"
          trend={-5}
        />
        <StatCard 
          title="Promedio Ocupación" 
          value="78%" 
          subtext="Esta semana"
          icon={TrendingUp}
          colorClass="bg-emerald-500 text-emerald-600"
          trend={8}
        />
        <StatCard 
          title="Próxima Reserva" 
          value="14:00" 
          subtext="Sala de Juntas B"
          icon={Clock}
          colorClass="bg-amber-500 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Ocupación Semanal</h3>
            <select className="bg-slate-50 dark:bg-slate-700 border-none text-sm rounded-md px-3 py-1">
              <option>Esta semana</option>
              <option>Semana pasada</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorOcupacion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#2563eb' }}
                />
                <Area type="monotone" dataKey="ocupacion" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorOcupacion)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar - Recommendations & Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recomendaciones IA</h3>
            <div className="space-y-4">
              <RecommendationCard 
                title="Evita el tráfico de las 18:00"
                desc="Sugerimos salir a las 17:30 hoy basado en el clima."
                time="Hace 10 min"
                type="warning"
              />
              <RecommendationCard 
                title="Reserva Sala A ahora"
                desc="Suele ocuparse completamente para las 10:00 AM los lunes."
                time="Hace 30 min"
                type="info"
              />
            </div>
            <button className="w-full mt-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
              Ver más sugerencias
            </button>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="font-bold text-lg mb-2">Check-in Pendiente</h3>
                <p className="text-slate-300 text-sm mb-4">Tienes una reserva activa para hoy a las 09:00 AM.</p>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full transition-colors">
                  Hacer Check-in
                </button>
             </div>
             <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
               <MapPin size={100} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
