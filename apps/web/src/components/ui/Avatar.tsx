import { cn } from "@/lib/cn";

export function Avatar({ initials, size = 30 }: { initials: string; size?: number }) {
  return (
    <div
      className="flex-none rounded-full grid place-items-center font-medium text-accent"
      style={{
        width: size,
        height: size,
        background: "var(--accent-soft2)",
        border: "1px solid var(--accent-line)",
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}

export function Card({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface", className)} style={style}>
      {children}
    </div>
  );
}
