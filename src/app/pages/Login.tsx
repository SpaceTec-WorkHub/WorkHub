import React from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Building2, ArrowRight, Lock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const baseurl = "http://localhost:3000/auth/login";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Enviando datos de login:', {
      email: (e.target as any).email.value,
      password: (e.target as any).password.value,
    });
    fetch(baseurl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: (e.target as any).email.value,
        password: (e.target as any).password.value,
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la autenticación');
        }
        navigate('/dashboard');
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Usuario y/o contraseña incorrectos. Por favor, inténtalo de nuevo.');
      });
    
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900">
      {/* Left Panel - Branding */}
      <div className="md:w-1/2 bg-blue-600 dark:bg-blue-800 text-white p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">WorkHub MTY</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Gestión inteligente de espacios corporativos.
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Optimiza tu experiencia en la oficina. Reserva escritorios, gestiona estacionamiento y conecta con tu equipo.
          </p>
        </div>
        
        {/* Abstract Pattern Background */}
        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 text-sm text-blue-200">
          © 2026 WorkHub Systems Inc.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Bienvenido de nuevo</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Ingresa tus credenciales corporativas para continuar.</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Correo Corporativo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="usuario@empresa.com"
                  className="mt-1 block w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Contraseña
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="block w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 dark:text-slate-400">
                  Recordarme
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Ingresar
              <ArrowRight className="ml-2 w-4 h-4" />
            </motion.button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Al ingresar, aceptas los términos de uso y política de privacidad de la organización.
          </div>
        </div>
      </div>
    </div>
  );
}
