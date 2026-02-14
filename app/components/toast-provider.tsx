"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface ToastMessage {
  readonly id: string;
  readonly message: string;
}

interface ToastContextValue {
  readonly pushToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Duration before a toast auto-dismisses (ms). */
const TOAST_DURATION_MS = 4000;

function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}

function ToastProvider({ children }: { readonly children: React.ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<readonly ToastMessage[]>([]);
  const timerMapRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /* Clear all pending timers on unmount */
  useEffect(() => {
    const timers = timerMapRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const pushToast = useCallback((message: string) => {
    if (!message.trim()) {
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, message }]);
    const timer = setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timerMapRef.current.delete(id);
    }, TOAST_DURATION_MS);
    timerMapRef.current.set(id, timer);
  }, []);

  const contextValue = useMemo<ToastContextValue>(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider, useToast };
