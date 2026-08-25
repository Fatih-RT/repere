import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useSubjects } from "@/lib/subjects";
import { useDashboard } from "@/lib/dashboard";
import { subjectHue } from "@/lib/visual";
import { useTheme } from "@/theme/ThemeProvider";
import { DiffTag, Dot } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: dash, isLoading: dashLoading } = useDashboard();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const isEmpty = !subjectsLoading && (subjects?.length ?? 0) === 0;
  const isLoading = subjectsLoading || (!isEmpty && dashLoading);

  const todayLine = !dash
    ? ""
    : dash.dueCount === 0
      ? "Tu es à jour — rien à réviser aujourd'hui."
      : `Tu as ${dash.dueCount} question${dash.dueCount > 1 ? "s" : ""} à revoir aujourd'hui${dash.dueChapters[0] ? `, surtout en ${dash.dueChapters[0].chapterName}` : ""}.`;

  const goalPct = dash && dash.goalTotalMinutes > 0 ? Math.round((dash.studiedTodayMinutes / dash.goalTotalMinutes) * 100) : 0;
  const goalRemaining = dash ? Math.max(0, dash.goalTotalMinutes - dash.studiedTodayMinutes) : 0;

  return (
    <div className="animate-fade">
      <div className="flex items-end gap-4 flex-wrap mb-[22px]">
        <div>
          <h1 className="m-0 mb-1 text-[26px] font-medium tracking-tight leading-[1.1]">Bonjour {firstName(user?.name ?? "")} 👋</h1>
          <p className="m-0 text-[14.5px] text-muted" style={{ textWrap: "pretty" }}>{todayLine}</p>
        </div>
        {!isEmpty && (
          <div className="ml-auto hidden md:flex gap-2">
            <Button onClick={() => navigate("/create")}><i className="ph ph-plus" style={{ fontSize: 15 }} /> Nouvelle question</Button>
            <Button variant="solid" onClick={() => navigate("/review/session", { state: { mode: "due" } })}>
              <i className="ph ph-play" style={{ fontSize: 14 }} /> Réviser
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))" }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon="ph ph-books"
          title="Tu n'as encore aucune matière"
          description="Crée ta première matière, ajoute quelques questions, et Repère s'occupe du reste : il te les proposera au bon moment."
          action={<Button variant="solid" onClick={() => navigate("/subjects")}><i className="ph ph-plus" style={{ fontSize: 15 }} /> Créer ma première matière</Button>}
        />
      ) : !dash ? null : (
        <div>
          <div className="grid gap-2.5 mb-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))" }}>
            {[
              { label: "À revoir", value: dash.dueCount, unit: "questions", hint: dash.dueChapters.length ? `${dash.dueChapters.length} chapitre${dash.dueChapters.length > 1 ? "s" : ""} concerné${dash.dueChapters.length > 1 ? "s" : ""}` : "Rien pour l'instant", icon: "ph ph-cards-three" },
              { label: "Taux de réussite", value: dash.accuracy7d ?? 0, unit: "%", hint: dash.accuracy7d === null ? "Pas encore de révisions" : "Sur les 7 derniers jours", icon: "ph ph-target" },
              { label: "Étudié aujourd'hui", value: dash.studiedTodayMinutes, unit: "min", hint: `Objectif ${dash.goalTotalMinutes} min`, icon: "ph ph-clock" },
              { label: "Série", value: dash.streak.current, unit: "jours", hint: `${dash.streak.activeDaysLast30} / 30 derniers jours`, icon: "ph ph-flame" },
            ].map((s) => (
              <div key={s.label} className="p-3.5 border border-border rounded-xl bg-surface">
                <div className="flex items-center gap-1.5 text-[11.5px] text-muted mb-2">
                  <i className={s.icon} style={{ fontSize: 14, color: "var(--accent)" }} /> {s.label}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[28px] font-medium tracking-tight tabular-nums leading-none">{s.value}</span>
                  <span className="text-[13px]" style={{ color: "var(--faint)" }}>{s.unit}</span>
                </div>
                <div className="text-[11.5px] mt-1.5" style={{ color: "var(--faint)" }}>{s.hint}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3.5 items-start lg:grid-cols-[1.55fr_1fr]">
            <div>
              <div className="flex items-baseline gap-2.5 mb-[11px]">
                <h2 className="m-0 text-base font-medium tracking-tight">À réviser aujourd'hui</h2>
                <span className="text-xs tabular-nums" style={{ color: "var(--faint)" }}>{dash.dueCount} questions</span>
              </div>
              <div className="flex flex-col gap-[9px]">
                {dash.dueChapters.slice(0, 5).map((c) => {
                  const hue = subjectHue(c.hue, false, isDark);
                  return (
                    <div key={c.chapterId} className="p-3.5 border border-border rounded-xl bg-surface flex flex-col gap-2.5 animate-rise">
                      <div className="flex items-center gap-2.5">
                        <div className="w-[30px] h-[30px] flex-none rounded-lg" style={{ background: `color-mix(in srgb, ${hue} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${hue} 34%, transparent)` }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14.5px] font-medium tracking-tight truncate">{c.chapterName}</div>
                          <div className="text-xs text-muted truncate">{c.subjectName} · {c.count} question{c.count > 1 ? "s" : ""}</div>
                        </div>
                        <DiffTag diff={c.diff} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1"><ProgressBar pct={c.pct} height={5} color={hue} /></div>
                        <span className="text-xs tabular-nums w-[34px] text-right" style={{ color: "var(--faint)" }}>{c.pct}%</span>
                        <Button size="sm" onClick={() => navigate("/review/session", { state: { mode: "selection", chapterIds: [c.chapterId] } })}>Réviser</Button>
                      </div>
                    </div>
                  );
                })}
                {dash.dueChapters.length === 0 && (
                  <div className="p-4 border border-dashed border-border2 rounded-xl text-center">
                    <p className="m-0 text-[13px]" style={{ color: "var(--faint)" }}>Rien à réviser pour l'instant. Reviens plus tard, ou ajoute de nouvelles questions.</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate("/subjects")}
                className="mt-[11px] inline-flex items-center gap-1.5 bg-transparent border-0 text-[13px]"
                style={{ color: "var(--accent)" }}
              >
                Voir toutes les matières <i className="ph ph-arrow-right" style={{ fontSize: 13 }} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="p-[15px] border rounded-xl bg-surface" style={{ borderColor: "var(--accent-line)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12.5px] text-muted">Objectif du jour</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>{goalPct}%</span>
                </div>
                <div className="flex items-baseline gap-[5px] mb-[11px]">
                  <span className="text-[32px] font-medium tracking-tight tabular-nums leading-none">{dash.studiedTodayMinutes}</span>
                  <span className="text-[15px] tabular-nums" style={{ color: "var(--faint)" }}>/ {dash.goalTotalMinutes} min</span>
                </div>
                <ProgressBar pct={goalPct} height={7} />
                <div className="text-[11.5px] mt-2.5" style={{ color: "var(--faint)" }}>
                  {goalRemaining > 0 ? `Encore ${goalRemaining} minutes — une session Pomodoro suffit.` : "Objectif atteint aujourd'hui."}
                </div>
              </div>

              <div className="p-[15px] border border-border rounded-xl bg-surface">
                <div className="text-[12.5px] text-muted mb-3">Temps de travail</div>
                <div className="flex items-end gap-[5px]" style={{ height: 56 }}>
                  {dash.weekBars.map((b, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        className="w-full rounded"
                        style={{ maxWidth: 18, height: `${Math.max(3, Math.round((b.minutes / 80) * 100))}%`, background: b.isToday ? "var(--accent)" : "color-mix(in srgb, var(--text) 16%, transparent)" }}
                      />
                      <span className="text-[10.5px]" style={{ color: b.isToday ? "var(--accent)" : "var(--faint)" }}>{b.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-[15px] border border-border rounded-xl bg-surface">
                <div className="text-[12.5px] text-muted mb-[13px]">Progression par matière</div>
                <div className="flex flex-col gap-[11px]">
                  {dash.subjectProgress.map((p) => (
                    <div key={p.name}>
                      <div className="flex items-center gap-2 mb-[5px]">
                        <Dot color={subjectHue(p.hue, false, isDark)} />
                        <span className="text-[12.5px] flex-1 truncate">{p.name}</span>
                        <span className="text-xs tabular-nums" style={{ color: "var(--faint)" }}>{p.pct}%</span>
                      </div>
                      <ProgressBar pct={p.pct} height={4} color={subjectHue(p.hue, false, isDark)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
