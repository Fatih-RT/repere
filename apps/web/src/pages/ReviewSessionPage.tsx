import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLibrary } from "@/lib/subjects";
import { useAnswerCard, useEndSession, useReviewQueue, useStartSession, newRecordId } from "@/lib/review";
import { questionImageUrl } from "@/lib/questions";
import { easeToDifficulty } from "@/lib/scheduler";
import { useSettings } from "@/lib/queries";
import { playChime } from "@/lib/sound";
import type { Question, Rating, ReviewSessionMode } from "@/lib/types";
import { MathText } from "@/components/MathText";
import { DiffTag } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";

interface LaunchState {
  mode?: ReviewSessionMode;
  subjectId?: string;
  chapterIds?: string[];
}

const RATINGS: { key: Rating; label: string; icon: string; colorVar: string; next: string }[] = [
  { key: "again", label: "Je me suis trompé", icon: "ph ph-x-circle", colorVar: "--err", next: "revu dans 10 min" },
  { key: "hard", label: "J'ai eu du mal", icon: "ph ph-minus-circle", colorVar: "--warn", next: "revu demain" },
  { key: "good", label: "Je maîtrise", icon: "ph ph-check-circle", colorVar: "--ok", next: "revu dans 6 jours" },
];

// mhchem covers formulas/equations but not structural or mechanism
// drawings (see CreateQuestionPage) — those only exist as pasted/uploaded
// images, so the review card needs to actually show them, not just the text.
function ReviewImages({ question, filenames }: { question: Question; filenames: string[] }) {
  if (!filenames.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {filenames.map((f) => (
        <img
          key={f}
          src={questionImageUrl(question, f)}
          alt=""
          className="rounded-lg border border-border object-contain"
          style={{ maxHeight: 220, maxWidth: "100%" }}
        />
      ))}
    </div>
  );
}

export function ReviewSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const launch = (location.state as LaunchState | null) ?? { mode: "due" as const };
  const { data: library } = useLibrary();
  const { data: settings } = useSettings();
  const { data: liveQueue, isLoading } = useReviewQueue({ subjectId: launch.subjectId, chapterIds: launch.chapterIds });
  const startSession = useStartSession();
  const endSession = useEndSession();
  const answerCard = useAnswerCard();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ again: 0, hard: 0, good: 0 });
  const cardStartedAt = useRef(Date.now());
  const sessionStartedAt = useRef(Date.now());
  const startedSession = useRef(false);

  // Frozen once when the queue first loads: answering a card invalidates
  // the live query (so the hub's counters update), but this session must
  // keep working through the exact batch it started with — re-deriving
  // `current` from a query that keeps shrinking as cards graduate out of
  // "due" would desync from `index` mid-session.
  const [queue, setQueue] = useState<typeof liveQueue>(undefined);
  useEffect(() => {
    if (queue === undefined && liveQueue) setQueue(liveQueue);
  }, [liveQueue, queue]);

  useEffect(() => {
    if (startedSession.current || !queue?.length) return;
    startedSession.current = true;
    startSession
      .mutateAsync({ mode: launch.mode ?? "due", subjectId: launch.subjectId, chapterId: launch.chapterIds?.length === 1 ? launch.chapterIds[0] : undefined })
      .then((session) => setSessionId(session.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue?.length]);

  useEffect(() => {
    cardStartedAt.current = Date.now();
  }, [index]);

  const current = queue?.[index];
  const nameById = useMemo(() => {
    const subjects = new Map<string, string>();
    const chapters = new Map<string, string>();
    for (const s of library ?? []) {
      subjects.set(s.id, s.name);
      for (const c of s.chaptersList) chapters.set(c.id, c.name);
    }
    return { subjects, chapters };
  }, [library]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " && !revealed) { e.preventDefault(); setRevealed(true); }
      if (revealed && ["1", "2", "3"].includes(e.key)) {
        const rating = (["again", "hard", "good"] as const)[Number(e.key) - 1];
        rate(rating);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, current, sessionId]);

  async function quit() {
    if (sessionId) {
      const seen = tally.again + tally.hard + tally.good;
      await endSession.mutateAsync({ id: sessionId, cardsSeen: seen, cardsCorrect: tally.good });
    }
    navigate("/dashboard");
  }

  async function rate(rating: Rating) {
    if (!current || !sessionId) return;
    const durationMs = Math.max(0, Date.now() - cardStartedAt.current);
    await answerCard.mutateAsync({ question: current, sessionId, rating, logId: newRecordId(), durationMs });
    const nextTally = { ...tally, [rating]: tally[rating] + 1 };
    setTally(nextTally);

    const isLast = index >= (queue?.length ?? 0) - 1;
    if (isLast) {
      const seen = nextTally.again + nextTally.hard + nextTally.good;
      await endSession.mutateAsync({ id: sessionId, cardsSeen: seen, cardsCorrect: nextTally.good });
      if (settings?.sons) playChime();
      const minutes = Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 60000));
      navigate("/review/summary", { state: { tally: nextTally, total: queue?.length ?? 0, minutes } });
      return;
    }
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (isLoading || !library || queue === undefined) {
    return (
      <div className="min-h-screen min-h-[100dvh] grid place-items-center bg-bg p-6">
        <Skeleton className="h-64 w-full max-w-[620px]" />
      </div>
    );
  }

  if (!queue?.length) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <p className="text-[15px] text-muted" style={{ textWrap: "pretty" }}>
          Rien à réviser pour l'instant — reviens plus tard ou ajoute de nouvelles questions.
        </p>
        <button type="button" onClick={() => navigate("/review")} className="text-[13.5px]" style={{ color: "var(--accent)" }}>
          Retour aux révisions
        </button>
      </div>
    );
  }

  if (!current) return null;

  const subjectName = nameById.subjects.get(current.subject) ?? "";
  const chapterName = nameById.chapters.get(current.chapter) ?? "";
  const diff = easeToDifficulty(current.ease_factor);
  const pos = index + 1;
  const total = queue.length;
  const barPct = ((index + (revealed ? 0.5 : 0)) / total) * 100;

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-bg relative overflow-hidden">
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-30%", left: "50%", transform: "translateX(-50%)", width: 540, height: 340, borderRadius: "50%",
          background: "radial-gradient(closest-side, var(--accent-soft), transparent)",
        }}
      />
      <div className="relative flex items-center gap-3.5 px-[18px] pb-[14px]" style={{ paddingTop: "max(14px, env(safe-area-inset-top))" }}>
        <button
          type="button"
          onClick={quit}
          className="w-[34px] h-[34px] flex-none grid place-items-center bg-transparent border-0 rounded-md hover:bg-hover"
          style={{ color: "var(--muted)" }}
          aria-label="Quitter la révision"
        >
          <i className="ph ph-x" style={{ fontSize: 17 }} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">{subjectName} · {chapterName}</div>
          <div className="text-[11.5px] tabular-nums" style={{ color: "var(--faint)" }}>{pos} sur {total} · {total - index} restantes</div>
        </div>
        <DiffTag diff={diff} />
      </div>
      <div className="relative h-[3px] bg-track mx-[18px] rounded-full overflow-hidden">
        <ProgressBar pct={barPct} height={3} />
      </div>

      <div className="relative flex-1 flex items-center justify-center p-[22px_18px] md:p-[32px_28px]">
        <div className="w-full max-w-[620px] p-[22px] md:p-8 bg-surface border border-border rounded-2xl shadow-lg">
          <div className="text-[11px] tracking-[.1em] uppercase mb-4" style={{ color: "var(--accent)" }}>Question</div>
          <div className="text-[22px] md:text-[29px] font-medium leading-[1.28] tracking-tight" style={{ textWrap: "pretty" }}>
            <MathText text={current.question} />
          </div>
          <ReviewImages question={current} filenames={current.question_images} />
          {revealed && (
            <div className="mt-6 animate-rise">
              <div
                className="h-px mb-5"
                style={{ background: "linear-gradient(to right, transparent, var(--border2) 40px, var(--border2) calc(100% - 40px), transparent)" }}
              />
              <div className="text-[11px] tracking-[.1em] uppercase mb-3" style={{ color: "var(--faint)" }}>Réponse</div>
              <div className="text-lg md:text-[23px] leading-[1.35] tracking-tight" style={{ color: "var(--accent)", textWrap: "pretty" }}>
                <MathText text={current.answer} />
              </div>
              <ReviewImages question={current} filenames={current.answer_images} />
            </div>
          )}
        </div>
      </div>

      <div className="relative p-[0_18px_20px]">
        {!revealed ? (
          <div>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="w-full min-h-[54px] inline-flex items-center justify-center gap-[9px] text-[15.5px] font-medium rounded-xl"
              style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent)" }}
            >
              <i className="ph ph-eye" style={{ fontSize: 17 }} /> Afficher la réponse
            </button>
            <div className="text-center text-[11.5px] mt-[11px]" style={{ color: "var(--faint)" }}>Barre d'espace pour révéler</div>
          </div>
        ) : (
          <div className="animate-rise">
            <div className="grid gap-[9px] sm:grid-cols-3">
              {RATINGS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => rate(r.key)}
                  disabled={answerCard.isPending}
                  className="flex flex-col items-center justify-center gap-[7px] w-full min-h-[76px] p-[12px_10px] rounded-xl text-center disabled:opacity-50"
                  style={{ border: `1px solid color-mix(in srgb, var(${r.colorVar}) 34%, transparent)`, background: "transparent", color: "var(--text)" }}
                >
                  <i className={r.icon} style={{ fontSize: 19, color: `var(${r.colorVar})` }} />
                  <span className="text-[13.5px] font-medium">{r.label}</span>
                  <span className="text-[11px]" style={{ color: "var(--faint)" }}>{r.next}</span>
                </button>
              ))}
            </div>
            <div className="text-center text-[11.5px] mt-[11px]" style={{ color: "var(--faint)" }}>Touches 1 · 2 · 3</div>
          </div>
        )}
      </div>
    </div>
  );
}
