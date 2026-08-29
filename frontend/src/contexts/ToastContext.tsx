import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  playBeep: (frequency?: number, type?: OscillatorType, duration?: number) => void;
  vibrate: (pattern?: number | number[]) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Web Audio API beep sound (zero external audio files needed!)
  const playBeep = useCallback((frequency = 800, type: OscillatorType = 'sine', duration = 0.12) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignoruj błędy audio jeśli przeglądarka blokuje autoplay
    }
  }, []);

  // Haptic feedback
  const vibrate = useCallback((pattern: number | number[] = 50) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Ignoruj
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 3500) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, title, duration }]);

      // Trigger audio & haptic on success or error
      if (type === 'success') {
        playBeep(880, 'sine', 0.1);
        vibrate(40);
      } else if (type === 'error') {
        playBeep(320, 'sawtooth', 0.2);
        vibrate([50, 50, 50]);
      }

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [playBeep, vibrate]
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getBg = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-slate-900/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40';
      case 'error':
        return 'bg-slate-900/95 border-rose-500/40 text-rose-100 shadow-rose-950/40';
      case 'warning':
        return 'bg-slate-900/95 border-amber-500/40 text-amber-100 shadow-amber-950/40';
      case 'info':
      default:
        return 'bg-slate-900/95 border-cyan-500/40 text-cyan-100 shadow-cyan-950/40';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, playBeep, vibrate }}>
      {children}
      {/* Toast floating container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md animate-slide-up transition-all ${getBg(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <div className="flex-1 text-sm">
              {toast.title && <div className="font-semibold mb-0.5 text-white">{toast.title}</div>}
              <div className="text-slate-200">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
