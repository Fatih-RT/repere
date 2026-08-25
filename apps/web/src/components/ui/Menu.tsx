import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export function Menu({ trigger, items }: { trigger: React.ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-7 h-7 flex-none grid place-items-center bg-transparent border-0 rounded-md hover:bg-hover"
        style={{ color: "var(--faint)" }}
      >
        {trigger}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[140px] rounded-md py-1 z-20 animate-rise"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              className="w-full text-left px-3 py-2 text-[13px] bg-transparent border-0 hover:bg-hover"
              style={{ color: item.danger ? "var(--err)" : "var(--text)" }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
