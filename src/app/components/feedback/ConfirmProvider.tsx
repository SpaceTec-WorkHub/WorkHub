import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

type ConfirmTone = 'default' | 'danger';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type PromptOptions = {
  title: string;
  description: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmState = ConfirmOptions & {
  kind: 'confirm';
  resolve: (value: boolean) => void;
};

type PromptState = PromptOptions & {
  kind: 'prompt';
  resolve: (value: string | null) => void;
};

type DialogState = ConfirmState | PromptState;

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  promptText: (options: PromptOptions) => Promise<string | null>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [textValue, setTextValue] = useState('');
  const [textError, setTextError] = useState('');

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ kind: 'confirm', resolve, ...options });
    });
  }, []);

  const promptText = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setTextValue('');
      setTextError('');
      setDialog({ kind: 'prompt', resolve, ...options });
    });
  }, []);

  const closeWith = useCallback(<T,>(value: T) => {
    const current = dialog;
    setDialog(null);
    if (current?.kind === 'confirm') {
      (current.resolve as (value: boolean) => void)(value as unknown as boolean);
    } else if (current?.kind === 'prompt') {
      (current.resolve as (value: string | null) => void)(value as unknown as string | null);
    }
  }, [dialog]);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm, promptText }), [confirm, promptText]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {dialog?.kind === 'confirm' ? (
          <motion.div
            key="confirm-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => closeWith(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    dialog.tone === 'danger'
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                  )}
                >
                  {dialog.tone === 'danger' ? <AlertCircle size={20} /> : <Info size={20} />}
                </span>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{dialog.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{dialog.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => closeWith(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {dialog.cancelLabel ?? 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => closeWith(true)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
                    dialog.tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700',
                  )}
                >
                  {dialog.confirmLabel ?? 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {dialog?.kind === 'prompt' ? (
          <motion.div
            key="prompt-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => closeWith(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-5"
            >
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{dialog.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{dialog.description}</p>
              <textarea
                value={textValue}
                onChange={(e) => {
                  setTextValue(e.target.value);
                  if (textError) setTextError('');
                }}
                placeholder={dialog.placeholder}
                rows={3}
                className="mt-3 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
              />
              {textError ? <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{textError}</p> : null}
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => closeWith(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {dialog.cancelLabel ?? 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = textValue.trim();
                    if (!trimmed) {
                      setTextError('Indica un motivo antes de continuar');
                      return;
                    }
                    closeWith(trimmed);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  {dialog.confirmLabel ?? 'Continuar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de un ConfirmProvider');
  }
  return ctx;
}
