import { useStats } from "@/lib/stats";
import { useDashboard } from "@/lib/dashboard";
import { useLibrary } from "@/lib/subjects";
import { useTheme } from "@/theme/ThemeProvider";
import { subjectHue } from "@/lib/visual";
import { relativeFr } from "@/lib/format";
import { Dot } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";

function fmtHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

function signed(n: number, suffix: string): string {
  return `${n > 0 ? "+" : ""}${n}${suffix}`;
}

export function StatsPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: dash, isLoading: dashLoading } = useDashboard();
  const { data: library } = useLibrary();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (statsLoading || dashLoading || !stats || !dash || !library) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const kpis = [
    { label: "Taux de réussite", value: stats.accuracy7d ?? 0, unit: "%", delta: stats.accuracyDeltaPts === null ? "—" : signed(stats.accuracyDeltaPts, " pts / 7 j"), color: stats.accuracyDeltaPts !== null && stats.accuracyDeltaPts < 0 ? "var(--err)" : "var(--ok)" },
    { label: "Temps cette semaine", value: fmtHoursMinutes(stats.minutesWeek), unit: "", delta: signed(stats.minutesWeekDelta, " min"), color: stats.minutesWeekDelta < 0 ? "var(--err)" : "var(--ok)" },
    { label: "Questions maîtrisées", value: stats.masteredCount, unit: `/ ${stats.totalActive}`, delta: `+${stats.masteredNewThisWeek} cette semaine`, color: "var(--faint)" },
    { label: "Questions difficiles", value: stats.hardCount, unit: "", delta: stats.hardSubjectName ? `Surtout en ${stats.hardSubjectName}` : "—", color: "var(--warn)" },
  ];

  const trendPath = stats.trendPoints.map((v, i) => `${(i / (stats.trendPoints.length - 1)) * 300},${90 - ((v - 0) / 100) * 80}`).join(" ");
  const maxWeekMinutes = Math.max(1, ...dash.weekBars.map((b) => b.minutes));

  return (
    <div className="animate-fade">
      <h1 className="m-0 mb-1 text-2xl font-medium tracking-tight">Statistiques</h1>
      <p className="m-0 mb-5 text-[13.5px] text-muted">Quatre questions, quatre graphiques. Rien de décoratif.</p>

      <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {kpis.map((k) => (
          <div key={k.label} className="p-3.5 border border-border rounded-xl bg-surface">
            <div className="text-[11.5px] text-muted mb-2">{k.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-medium tracking-tight tabular-nums leading-none">{k.value}</span>
              <span className="text-xs" style={{ color: "var(--faint)" }}>{k.unit}</span>
            </div>
            <div className="text-[11.5px] mt-1.5" style={{ color: k.color }}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-[11px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(288px, 1fr))" }}>
        <div className="p-4 border border-border rounded-xl bg-surface">
          <div className="text-[13.5px] font-medium mb-0.5">Est-ce que je progresse ?</div>
          <div className="text-[11.5px] mb-4" style={{ color: "var(--faint)" }}>Taux de réussite, 8 dernières semaines</div>
          <svg viewBox="0 0 300 90" preserveAspectRatio="none" style={{ width: "100%", height: 90, overflow: "visible" }}>
            <polyline points={trendPath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div className="flex justify-between text-[11px] mt-2" style={{ color: "var(--faint)" }}>
            <span>S-8</span><span>Aujourd'hui</span>
          </div>
        </div>

        <div className="p-4 border border-border rounded-xl bg-surface">
          <div className="text-[13.5px] font-medium mb-0.5">Combien de temps cette semaine ?</div>
          <div className="text-[11.5px] mb-4" style={{ color: "var(--faint)" }}>Minutes travaillées par jour</div>
          <div className="flex items-end gap-[7px]" style={{ height: 90 }}>
            {dash.weekBars.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-[7px] h-full justify-end">
                <span className="text-[10.5px] tabular-nums" style={{ color: "var(--faint)" }}>{b.minutes}</span>
                <div
                  className="w-full rounded"
                  style={{ height: `${Math.max(3, Math.round((b.minutes / maxWeekMinutes) * 100))}%`, background: b.isToday ? "var(--accent)" : "color-mix(in srgb, var(--text) 16%, transparent)" }}
                />
                <span className="text-[10.5px]" style={{ color: b.isToday ? "var(--accent)" : "var(--faint)" }}>{b.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border border-border rounded-xl bg-surface">
          <div className="text-[13.5px] font-medium mb-0.5">Quelle matière travailler ?</div>
          <div className="text-[11.5px] mb-4" style={{ color: "var(--faint)" }}>Maîtrise croisée avec le temps passé</div>
          <div className="flex flex-col gap-3">
            {library.slice(0, 5).map((s) => (
              <div key={s.id}>
                <div className="flex items-center gap-2 mb-[5px]">
                  <Dot color={subjectHue(s.hue, false, isDark)} />
                  <span className="text-[12.5px] flex-1 truncate">{s.name}</span>
                  <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>{relativeFr(s.lastReviewedAt).replace(/^Révisé /, "")}</span>
                  <span className="text-xs tabular-nums w-8 text-right">{s.mastery}%</span>
                </div>
                <ProgressBar pct={s.mastery} height={4} color={subjectHue(s.hue, false, isDark)} />
              </div>
            ))}
            {library.length === 0 && <p className="m-0 text-[12.5px]" style={{ color: "var(--faint)" }}>Aucune matière pour l'instant.</p>}
          </div>
        </div>

        <div className="p-4 border border-border rounded-xl bg-surface">
          <div className="text-[13.5px] font-medium mb-0.5">Où en est ma régularité ?</div>
          <div className="text-[11.5px] mb-4" style={{ color: "var(--faint)" }}>70 derniers jours · {dash.streak.current} jour{dash.streak.current > 1 ? "s" : ""} d'affilée</div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
            {stats.heat.map((v, i) => (
              <div key={i} className="rounded-[3px]" style={{ aspectRatio: "1", background: v > 0 ? `color-mix(in srgb, var(--accent) ${Math.round(v * 80)}%, transparent)` : "var(--track)" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
