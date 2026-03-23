/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastTone = 'info' | 'success' | 'error' | 'loading';

interface ToastPayload {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends ToastPayload {
  id: number;
}

interface ToastContextValue {
  pushToast: (toast: ToastPayload) => void;
}

const toneClasses: Record<ToastTone, string> = {
  info: 'border-white/12 bg-zinc-950/90 text-zinc-200',
  success: 'border-emerald-400/20 bg-emerald-500/12 text-emerald-100',
  error: 'border-rose-400/20 bg-rose-500/12 text-rose-100',
  loading: 'border-violet-400/20 bg-violet-500/12 text-violet-100',
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: ToastPayload) => {
    const id = nextId.current++;
    const duration = toast.duration ?? (toast.tone === 'error' ? 5500 : 3600);
    setToasts((current) => [...current, { ...toast, id }]);

    window.setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className='pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-3'>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${toneClasses[toast.tone ?? 'info']}`}
            role='status'
            aria-live='polite'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='space-y-1'>
                <p className='font-medium text-white'>{toast.title}</p>
                {toast.message ? <p className='text-sm leading-5 opacity-90'>{toast.message}</p> : null}
              </div>
              <button
                type='button'
                onClick={() => removeToast(toast.id)}
                className='rounded-full border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white'
                aria-label='Dismiss notification'
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export function ToastOnMount({
  title,
  message,
  tone = 'info',
}: {
  title: string;
  message?: string;
  tone?: ToastTone;
}) {
  const { pushToast } = useToast();

  useEffect(() => {
    pushToast({ title, message, tone });
  }, [message, pushToast, title, tone]);

  return null;
}
