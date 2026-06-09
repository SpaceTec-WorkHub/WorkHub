import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Building2, ArrowRight, Lock, UserPlus } from 'lucide-react';
import { isAuthenticated, login, registerBasicUser, saveSession } from '../../services/auth';
import { useToast } from '../components/feedback/ToastProvider';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const isRegisterMode = mode === 'register';

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRegisterMode && password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden.');
      }

      if (isRegisterMode) {
        await registerBasicUser({
          full_name: fullName,
          email,
          password,
          user_type: 'internal',
          status: 'active',
        });
      }

      const response = await login(email, password);
      saveSession(response.user, rememberMe);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isRegisterMode
            ? 'No fue posible crear la cuenta.'
            : 'No fue posible iniciar sesión.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900">
      <div className="md:w-1/2 bg-purple-950 text-white p-12 flex flex-col justify-between relative overflow-hidden">
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

          <p className="text-purple-100 text-lg max-w-md">
            Consulta espacios disponibles, aparta escritorio o estacionamiento y haz check-in desde una sola plataforma.
          </p>
        </div>

        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 text-sm text-purple-200">© 2026 WorkHub MTY</div>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {isRegisterMode
                ? 'Regístrate con una cuenta básica para acceder a WorkHub.'
                : 'Usa tu correo corporativo para entrar.'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {isRegisterMode ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre completo</label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1 block w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                {isRegisterMode ? 'Correo' : 'Correo corporativo'}
              </label>
              <input
                type="email"
                required
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 block w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña</label>

            {isRegisterMode ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">Confirmar contraseña</label>
                <div className="relative mt-1">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="block w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                </div>
              </div>
            ) : null}
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
                  className="block w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                  className="h-4 w-4 mr-2 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                />
                Recordarme
              </label>

              <a href="#" className="text-sm font-medium text-purple-600 hover:text-purple-500">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              {isSubmitting ? (isRegisterMode ? 'Creando cuenta...' : 'Ingresando...') : isRegisterMode ? 'Crear cuenta' : 'Ingresar'}
              {isRegisterMode ? <UserPlus className="ml-2 w-4 h-4" /> : <ArrowRight className="ml-2 w-4 h-4" />}
            </motion.button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {isRegisterMode ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            {' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-purple-600 hover:text-purple-500"
            >
              {isRegisterMode ? 'Inicia sesión' : 'Regístrate'}
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
