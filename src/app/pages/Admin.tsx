import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Download, AlertTriangle, Lock, Unlock, Calendar, Users } from 'lucide-react';

const occupancyData = [
  { name: '08:00', oficinas: 20, parking: 10 },
  { name: '10:00', oficinas: 55, parking: 45 },
  { name: '12:00', oficinas: 85, parking: 90 },
  { name: '14:00', oficinas: 60, parking: 50 },
  { name: '16:00', oficinas: 75, parking: 70 },
  { name: '18:00', oficinas: 30, parking: 20 },
];

const zoneData = [
  { name: 'Piso 4 - Norte', value: 400 },
  { name: 'Piso 4 - Sur', value: 300 },
  { name: 'Piso 5', value: 300 },
  { name: 'Salas', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Admin() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel Administrativo</h1>
           <p className="text-slate-500">Monitoreo y gestión de instalaciones en tiempo real.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
          <Download size={16} /> Exportar Reporte
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Ocupación Total</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">78%</p>
          <span className="text-xs text-green-600 flex items-center mt-1">↑ 12% vs ayer</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Check-ins Activos</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">142</p>
          <span className="text-xs text-slate-500 mt-1">Usuarios en sitio</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Alertas</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">3</p>
          <span className="text-xs text-amber-600 mt-1">Requieren atención</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Eficiencia Energética</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">92%</p>
          <span className="text-xs text-green-600 mt-1">Optimizado</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Tendencia de Ocupación (Hoy)</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={occupancyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorOficinas" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorParking" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                 <Tooltip />
                 <Legend />
                 <Area type="monotone" dataKey="oficinas" stroke="#2563eb" fillOpacity={1} fill="url(#colorOficinas)" />
                 <Area type="monotone" dataKey="parking" stroke="#82ca9d" fillOpacity={1} fill="url(#colorParking)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Distribución por Zonas</h3>
          <div className="h-64 flex justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={zoneData}
                   innerRadius={60}
                   outerRadius={80}
                   fill="#8884d8"
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {zoneData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
                 <Legend verticalAlign="bottom" height={36} iconType="circle" />
               </PieChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
           <h3 className="font-bold text-slate-900 dark:text-white">Acciones Rápidas</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="border border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 p-4 rounded-lg">
             <div className="flex items-center gap-3 text-red-600 mb-2">
               <Lock size={20} />
               <h4 className="font-semibold">Bloqueo de Emergencia</h4>
             </div>
             <p className="text-xs text-red-600/80 mb-3">Cierra reservas en zonas seleccionadas inmediatamente.</p>
             <button className="w-full py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors">
               Configurar Bloqueo
             </button>
           </div>

           <div className="border border-blue-100 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900/30 p-4 rounded-lg">
             <div className="flex items-center gap-3 text-blue-600 mb-2">
               <Calendar size={20} />
               <h4 className="font-semibold">Eventos Especiales</h4>
             </div>
             <p className="text-xs text-blue-600/80 mb-3">Reserva áreas completas para town halls o visitas.</p>
             <button className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors">
               Crear Evento
             </button>
           </div>

           <div className="border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-600 p-4 rounded-lg">
             <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 mb-2">
               <Users size={20} />
               <h4 className="font-semibold">Gestión de Usuarios</h4>
             </div>
             <p className="text-xs text-slate-500 mb-3">Administra permisos y accesos VIP.</p>
             <button className="w-full py-2 bg-slate-700 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors">
               Ver Usuarios
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
