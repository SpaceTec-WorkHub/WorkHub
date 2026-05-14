import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Building2, ArrowRight, Lock } from 'lucide-react';
import { isAuthenticated, login, saveSession } from '../../services/auth';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await login(email, password);
      saveSession(response.user, rememberMe);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
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

        <div className="relative z-10 text-sm text-blue-200">© 2026 WorkHub MTY</div>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Iniciar sesión</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Usa tu correo corporativo para entrar.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Correo corporativo</label>
              <input
                type="email"
                required
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 block w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="block w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-slate-600">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 mr-2 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                Recordarme
              </label>

              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </motion.button>
          </form>

          <div className="text-center text-xs text-slate-400">
            WorkHub MTY es una herramienta interna para gestionar reservas y disponibilidad de espacios.
          </div>
        </div>
      </div>
    </div>
  );
}
