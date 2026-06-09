import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type ToastContextValue = {
  showToast: (variant: ToastVariant, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<ToastVariant, { box: string; iconWrap: string; icon: ReactNode }> = {
  success: {
    box: 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    iconWrap: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    icon: <CheckCircle2 size={16} />,
  },
  error: {
    box: 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    iconWrap: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    icon: <AlertCircle size={16} />,
  },
  info: {
    box: 'border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    iconWrap: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    icon: <Info size={16} />,
  },
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  const style = TOAST_STYLES[toast.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className={clsx(
        'flex items-start gap-3 p-3.5 pr-2.5 rounded-xl border shadow-lg bg-white dark:bg-slate-800 max-w-sm w-full pointer-events-auto',
        style.box,
      )}
    >
      <span className={clsx('w-7 h-7 rounded-full flex items-center justify-center shrink-0', style.iconWrap)}>
        {style.icon}
      </span>
      <p className="text-sm flex-1 pt-0.5 text-slate-700 dark:text-slate-200">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 -mr-1 shrink-0"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((variant: ToastVariant, message: string) => {
    const id = nextToastId++;
    setToasts((current) => [...current, { id, variant, message }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message: string) => showToast('success', message),
      error: (message: string) => showToast('error', message),
      info: (message: string) => showToast('info', message),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return ctx;
}
