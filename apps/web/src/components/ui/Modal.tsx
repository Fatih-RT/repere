import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// A minimal, reusable dialog — backdrop click, Escape, and the close
// button all dismiss it. No focus trap: this app's dialogs are short-lived
// informational popovers, not forms that need strict keyboard containment.
export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade"
      style={{ background: "color-mix(in srgb, black 55%, transparent)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] max-h-[85vh] flex flex-col rounded-xl bg-surface border border-border shadow-lg animate-rise"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-none">
          <span className="flex-1 text-[15px] font-medium tracking-tight">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 grid place-items-center rounded-md hover:bg-hover"
            style={{ color: "var(--muted)" }}
          >
            <i className="ph ph-x" style={{ fontSize: 17 }} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
