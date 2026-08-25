import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  show: (message: string) => void;
  showUndo: (message: string, onUndo: () => void, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((message: string) => {
    setToast({ message });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const showUndo = useCallback((message: string, onUndo: () => void, durationMs = 5000) => {
    setToast({
      message,
      actionLabel: "Annuler",
      onAction: () => {
        onUndo();
        setToast(null);
      },
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), durationMs);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ show, showUndo }}>
      {children}
      {toast && (
        <div
          className="fixed left-1/2 bottom-6 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2.5 rounded-md text-[13.5px] z-50 animate-rise"
          style={{ background: "var(--surface)", border: "1px solid var(--accent-line)", boxShadow: "var(--shadow)" }}
        >
          <i className="ph-fill ph-check-circle" style={{ fontSize: 16, color: "var(--accent)" }} />
          {toast.message}
          {toast.onAction && (
            <button
              type="button"
              onClick={toast.onAction}
              className="ml-1.5 font-medium bg-transparent border-0"
              style={{ color: "var(--accent)" }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
