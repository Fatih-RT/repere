export function ProgressBar({ pct, height = 5, color }: { pct: number; height?: number; color?: string }) {
  return (
    <div className="rounded-full bg-track overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color ?? "var(--accent)" }}
      />
    </div>
  );
}
