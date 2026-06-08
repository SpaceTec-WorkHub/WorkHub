import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, ChevronDown, MapPin, Calendar, Clock, Car, Trophy, User } from 'lucide-react';
import { sendChatMessage } from '../../services/navigationAI';
import { getStoredSession } from '../../services/auth';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isNavigation?: boolean;
  route?: string;
};

const ROUTE_MAP: Record<string, string> = {
  dashboard:          '/dashboard',
  mapa_espacios:      '/map',
  reservar:           '/reservation',
  historial_reservas: '/reservations',
  check_in:           '/check-in',
  carpool:            '/carpool',
  gamificacion:       '/gamification',
  perfil:             '/profile',
  soporte:            '/dashboard',
};

function resolveRoute(rawRuta: string): string {
  const key = rawRuta.replace(/^\//, '');
  return ROUTE_MAP[key] ?? rawRuta;
}

const SUGGESTED = [
  { label: 'Ir al mapa', icon: MapPin },
  { label: 'Ver mis reservas', icon: Calendar },
  { label: 'Hacer check-in', icon: Clock },
  { label: 'Ver carpool', icon: Car },
  { label: 'Gamificación', icon: Trophy },
  { label: 'Mi perfil', icon: User },
];

export default function AIChatBubble() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: '¡Hola! Soy tu asistente de WorkHub. Puedo llevarte a cualquier parte de la app o responder tus dudas. ¿En qué te ayudo?',
    },
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const navigate  = useNavigate();

  const session = getStoredSession();
  const userId  = String(
    (session?.user as Record<string, unknown>)?.user_id ??
    (session?.user as Record<string, unknown>)?.id ??
    'guest',
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(msg, userId);

      if (
        res.tipo === 'navegacion' &&
        res.datos &&
        typeof res.datos === 'object' &&
        'ruta' in res.datos &&
        typeof (res.datos as { ruta: string }).ruta === 'string'
      ) {
        const resolved = resolveRoute((res.datos as { ruta: string }).ruta);
        const navMsg: Message = {
          id:           Date.now().toString() + '-nav',
          role:         'assistant',
          text:         'Te llevo ahí ahora mismo...',
          isNavigation: true,
          route:        resolved,
        };
        setMessages(prev => [...prev, navMsg]);
        setTimeout(() => {
          navigate(resolved);
          setOpen(false);
        }, 850);
      } else {
        const rawDatos = res.datos;
        const displayText =
          typeof rawDatos === 'string'
            ? rawDatos
            : typeof rawDatos === 'object' && rawDatos !== null && 'accion' in rawDatos
              ? `Navegando a: ${(rawDatos as { ruta?: string }).ruta ?? 'destino desconocido'}`
              : 'Las pantallas disponibles son: Dashboard, Mapa, Reservar, Historial, Check-in, Carpool, Gamificación, Perfil y Soporte.';

        const textMsg: Message = {
          id:   Date.now().toString() + '-txt',
          role: 'assistant',
          text: displayText,
        };
        setMessages(prev => [...prev, textMsg]);
        if (!open) setUnread(n => n + 1);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '-err', role: 'assistant', text: 'No pude conectarme al servidor. Intenta de nuevo.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white"
            style={{ maxHeight: '560px', boxShadow: '0 24px 64px rgba(0,0,0,0.16)' }}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-none">Asistente WorkHub</p>
                <p className="text-blue-200 text-[11px] mt-0.5">Gemini · MCP Navigation</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-colors"
              >
                <ChevronDown size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 min-h-0">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Sparkles size={11} className="text-blue-600" />
                    </div>
                  )}
                  <div className={`max-w-[76%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : m.isNavigation
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-tl-sm font-medium'
                        : 'bg-white text-slate-700 border border-slate-200 shadow-sm rounded-tl-sm'
                  }`}>
                    {m.isNavigation
                      ? <span className="flex items-center gap-1.5"><span>🚀</span>{m.text}</span>
                      : m.text
                    }
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Sparkles size={11} className="text-blue-600" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 150, 300].map(delay => (
                        <span
                          key={delay}
                          className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {showSuggestions && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {SUGGESTED.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      onClick={() => handleSend(label)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm text-left"
                    >
                      <Icon size={13} className="shrink-0 text-blue-400" />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="px-3 py-3 bg-white border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Escribe un mensaje..."
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors"
        style={{ boxShadow: '0 8px 32px rgba(37,99,235,0.42)' }}
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x"  initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.14 }}><X size={21} className="text-white" /></motion.div>
            : <motion.div key="sp" initial={{ rotate: 90,  opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.14 }}><Sparkles size={21} className="text-white" /></motion.div>
          }
        </AnimatePresence>

        <AnimatePresence>
          {unread > 0 && !open && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}