import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/lib/queries";
import { useSubject, useSubjects } from "@/lib/subjects";
import { useLogPomodoroSession, usePomodoroStats } from "@/lib/pomodoro";
import { playChime } from "@/lib/sound";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PomodoroPhase } from "@/lib/types";

const RADIUS = 114;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PHASE_LABEL: Record<PomodoroPhase, string> = { focus: "Travail", short_break: "Pause courte", long_break: "Pause longue" };

function fmtClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

export function PomodoroPage() {
  const { data: settings } = useSettings();
  const { data: subjects } = useSubjects();
  const { data: stats } = usePomodoroStats();
  const logSession = useLogPomodoroSession();
  const navigate = useNavigate();

  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const activeSubjectId = subjectId || subjects?.[0]?.id || "";
  const { data: subjectDetail } = useSubject(activeSubjectId || undefined);
  const activeChapterId = chapterId || subjectDetail?.chaptersList[0]?.id || "";

  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [focusCompletedInCycle, setFocusCompletedInCycle] = useState(0);
  const startedAt = useRef<Date | null>(null);
  const initialized = useRef(false);

  function durationFor(p: PomodoroPhase): number {
    if (!settings) return 0;
    return (p === "focus" ? settings.pomo_work : p === "short_break" ? settings.pomo_short : settings.pomo_long) * 60;
  }

  useEffect(() => {
    if (!settings || initialized.current) return;
    initialized.current = true;
    setSecondsLeft(durationFor("focus"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  useEffect(() => {
    if (!running || secondsLeft === null) return;
    const id = setInterval(() => setSecondsLeft((s) => (s !== null ? Math.max(0, s - 1) : s)), 1000);
    return () => clearInterval(id);
  }, [running, secondsLeft === null]);

  useEffect(() => {
    if (secondsLeft !== 0 || !running) return;
    setRunning(false);
    if (settings?.sons) playChime();
    if (startedAt.current) {
      logSession.mutate({
        phase, plannedSeconds: durationFor(phase), actualSeconds: durationFor(phase), startedAt: startedAt.current,
        completed: true, subjectId: activeSubjectId || undefined, chapterId: activeChapterId || undefined,
      });
    }
    startedAt.current = null;
    if (phase === "focus") {
      const nextCount = focusCompletedInCycle + 1;
      setFocusCompletedInCycle(nextCount);
      const next: PomodoroPhase = settings && nextCount % settings.pomo_sessions === 0 ? "long_break" : "short_break";
      setPhase(next);
      setSecondsLeft(durationFor(next));
    } else {
      setPhase("focus");
      setSecondsLeft(durationFor("focus"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  function commitPartialIfAny() {
    if (startedAt.current && secondsLeft !== null) {
      const planned = durationFor(phase);
      const actual = planned - secondsLeft;
      if (actual > 0) {
        logSession.mutate({
          phase, plannedSeconds: planned, actualSeconds: actual, startedAt: startedAt.current,
          completed: false, subjectId: activeSubjectId || undefined, chapterId: activeChapterId || undefined,
        });
      }
    }
    startedAt.current = null;
  }

  function toggle() {
    if (secondsLeft === null) return;
    if (running) {
      setRunning(false);
      // Pausing keeps progress in-memory (not logged yet) — only a reset
      // or phase switch commits a partial session.
      return;
    }
    if (!startedAt.current) startedAt.current = new Date();
    setRunning(true);
  }

  function reset() {
    commitPartialIfAny();
    setRunning(false);
    setSecondsLeft(durationFor(phase));
  }

  function switchPhase(p: PomodoroPhase) {
    if (p === phase) return;
    commitPartialIfAny();
    setRunning(false);
    setPhase(p);
    setSecondsLeft(durationFor(p));
  }

  if (!settings || secondsLeft === null) {
    return <Skeleton className="h-96 max-w-[520px] mx-auto" />;
  }

  const total = durationFor(phase);
  const offset = total > 0 ? CIRCUMFERENCE - CIRCUMFERENCE * (secondsLeft / total) : 0;
  const phaseLabel = phase === "focus"
    ? (running ? `Travail en cours${subjectDetail ? ` · ${subjectDetail.name}` : ""}` : "Travail · prêt à démarrer")
    : PHASE_LABEL[phase];
  const action = running ? "Mettre en pause" : secondsLeft === 0 ? "Recommencer" : "Démarrer";

  return (
    <div className="animate-fade flex flex-col items-center">
      <div className="w-full max-w-[520px]">
        <div className="flex justify-center mb-[26px]">
          <div className="inline-flex border border-border rounded-[9px] overflow-hidden">
            {(["focus", "short_break", "long_break"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => switchPhase(p)}
                className="px-3.5 py-2 text-[12.5px]"
                style={phase === p ? { color: "var(--accent)", background: "var(--accent-soft)" } : { color: "var(--muted)", background: "transparent" }}
              >
                {PHASE_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="relative grid place-items-center mx-auto mb-[26px]" style={{ width: 252, height: 252 }}>
          <svg viewBox="0 0 252 252" className="absolute inset-0 pointer-events-none" style={{ transform: "rotate(-90deg)" }}>
            <circle cx={126} cy={126} r={RADIUS} fill="none" stroke="var(--track)" strokeWidth={9} />
            <circle
              cx={126} cy={126} r={RADIUS} fill="none" stroke="var(--accent)" strokeWidth={9} strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset .9s linear" }}
            />
          </svg>
          <div className="text-center">
            <div className="text-[52px] font-medium tracking-tight tabular-nums leading-none">{fmtClock(secondsLeft)}</div>
            <div className="text-[12.5px] text-muted mt-[7px]">{phaseLabel}</div>
          </div>
        </div>

        <div className="flex justify-center gap-2.5 mb-[26px]">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center gap-2.5 px-6 py-3 text-[14.5px] font-medium rounded-[10px]"
            style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent)", minHeight: 48 }}
          >
            <i className={running ? "ph ph-pause" : "ph ph-play"} style={{ fontSize: 16 }} /> {action}
          </button>
          <button
            type="button"
            onClick={reset}
            className="w-12 h-12 grid place-items-center rounded-[10px]"
            style={{ color: "var(--text)", border: "1px solid var(--border)" }}
            aria-label="Réinitialiser"
          >
            <i className="ph ph-arrow-counter-clockwise" style={{ fontSize: 17 }} />
          </button>
        </div>

        <div className="grid gap-[11px] mb-[11px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <label className="block">
            <span className="block text-xs mb-1.5 text-muted">Matière</span>
            <Select value={activeSubjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); }}>
              {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="block text-xs mb-1.5 text-muted">Chapitre</span>
            <Select value={activeChapterId} onChange={(e) => setChapterId(e.target.value)}>
              {subjectDetail?.chaptersList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-[11px] mb-[11px]">
          {[
            { label: "Sessions terminées", value: stats?.completedToday ?? 0 },
            { label: "Aujourd'hui", value: `${stats?.minutesToday ?? 0} min` },
            { label: "Cette semaine", value: fmtHoursMinutes(stats?.minutesWeek ?? 0) },
          ].map((s) => (
            <div key={s.label} className="p-[12px_13px] border border-border rounded-[11px] bg-surface text-center">
              <div className="text-[21px] font-medium tracking-tight tabular-nums leading-none">{s.value}</div>
              <div className="text-[11.5px] text-muted mt-[5px]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="p-[13px_15px] border border-border rounded-[11px] bg-surface flex items-center gap-3.5 flex-wrap">
          <span className="text-[12.5px] text-muted mr-auto">
            Travail {settings.pomo_work} · Pause {settings.pomo_short} · Longue pause {settings.pomo_long} · {settings.pomo_sessions} sessions
          </span>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="inline-flex items-center gap-1.5 px-2.5 py-[5px] text-[12.5px] rounded-md"
            style={{ color: "var(--text)", border: "1px solid var(--border)" }}
          >
            <i className="ph ph-sliders-horizontal" style={{ fontSize: 13 }} /> Régler
          </button>
        </div>
      </div>
    </div>
  );
}
