import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Building2, ArrowRight, Lock, UserPlus } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900">
      <div className="md:w-1/2 bg-blue-600 dark:bg-blue-800 text-white p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">WorkHub MTY</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Reserva tu lugar antes de llegar a la oficina.
          </h1>

          <p className="text-blue-100 text-lg max-w-md">
            Consulta espacios disponibles, aparta escritorio o estacionamiento y haz check-in desde una sola plataforma.
          </p>
        </div>

        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 text-sm text-blue-200">
          © 2026 WorkHub MTY
        </div>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>

            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {isRegister
                ? 'Completa tus datos para empezar a usar WorkHub MTY.'
                : 'Usa tu correo de la empresa para entrar.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ana Martínez"
                  className="mt-1 block w-full px-3 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Correo corporativo
              </label>
              <input
                type="email"
                required
                placeholder="nombre@empresa.com"
                className="mt-1 block w-full px-3 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Área o departamento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Operaciones"
                  className="mt-1 block w-full px-3 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>

              <div className="relative mt-1">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full px-3 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                  <Lock size={16} />
                </div>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="mt-1 block w-full px-3 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {!isRegister && (
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm text-slate-600">
                  <input type="checkbox" className="h-4 w-4 mr-2" />
                  Recordarme
                </label>

                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {isRegister ? 'Crear cuenta' : 'Entrar'}
              {isRegister ? (
                <UserPlus className="ml-2 w-4 h-4" />
              ) : (
                <ArrowRight className="ml-2 w-4 h-4" />
              )}
            </motion.button>
          </form>

          <div className="text-center text-sm">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Primera vez usando WorkHub?'}{' '}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isRegister ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </div>

          <div className="text-center text-xs text-slate-400">
            WorkHub MTY es una herramienta interna para gestionar reservas y disponibilidad de espacios.
          </div>
        </div>
      </div>
    </div>
  );
}