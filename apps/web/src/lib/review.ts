import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "./pb";
import { useSettings } from "./queries";
import { appDayStart } from "./day";
import { schedule, type CardState, type Rating } from "./scheduler";
import type { Question, ReviewLog, ReviewSession, ReviewSessionMode } from "./types";

// Bumped only if the scheduling formula changes — lets a future dashboard
// distinguish review_logs written under different scheduler behavior.
const SCHEDULER_VERSION = "srs-v1";

// Client-generated record ids double as idempotency keys: a retried create
// (e.g. a flaky connection) reuses the same id and PocketBase rejects the
// duplicate instead of writing the review twice.
export function newRecordId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 15; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export interface QueueParams {
  // Explicit chapter selection from the Révisions hub — bypasses the daily
  // limits (the student chose to study this, overriding the day's plan).
  // Omitted entirely: today's scheduled queue, capped by
  // user_settings.daily_new_limit / daily_review_limit.
  chapterIds?: string[];
  subjectId?: string;
}

function dueSort(a: Question, b: Question) {
  return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
}
function newSort(a: Question, b: Question) {
  return a.created.localeCompare(b.created);
}

export function useReviewQueue(params: QueueParams) {
  const { data: settings } = useSettings();
  const custom = !!params.chapterIds?.length;
  return useQuery({
    queryKey: ["review-queue", params.subjectId, params.chapterIds?.slice().sort().join(",")],
    queryFn: async (): Promise<Question[]> => {
      let filter = `deleted_at = "" && suspended = false`;
      if (params.chapterIds?.length) {
        filter += ` && (${params.chapterIds.map((id) => pb.filter("chapter = {:id}", { id })).join(" || ")})`;
      } else if (params.subjectId) {
        filter += ` && ${pb.filter("subject = {:id}", { id: params.subjectId })}`;
      }
      const all = await pb.collection("questions").getFullList<Question>({ filter, sort: "created" });
      const now = Date.now();
      const dueCards = all.filter((q) => q.state !== "new" && new Date(q.due_at).getTime() <= now).sort(dueSort);
      const newCards = all.filter((q) => q.state === "new").sort(newSort);

      if (custom) return [...dueCards, ...newCards];

      const dayStart = appDayStart(new Date(), settings!.timezone, settings!.day_cutoff_hour);
      const todayLogs = await pb.collection("review_logs").getFullList<ReviewLog>({
        filter: pb.filter("reviewed_at >= {:start}", { start: dayStart.toISOString() }),
        fields: "state_before",
      });
      const newAlready = todayLogs.filter((l) => l.state_before === "new").length;
      const reviewAlready = todayLogs.length - newAlready;
      const reviewBudget = Math.max(0, settings!.daily_review_limit - reviewAlready);
      const newBudget = Math.max(0, settings!.daily_new_limit - newAlready);

      return [...dueCards.slice(0, reviewBudget), ...newCards.slice(0, newBudget)];
    },
    enabled: custom || !!settings,
  });
}

export function useStartSession() {
  return useMutation({
    mutationFn: (data: { mode: ReviewSessionMode; subjectId?: string; chapterId?: string }) =>
      pb.collection("review_sessions").create<ReviewSession>({
        user: pb.authStore.record!.id,
        mode: data.mode,
        subject: data.subjectId ?? "",
        chapter: data.chapterId ?? "",
        started_at: new Date().toISOString(),
        cards_seen: 0,
        cards_correct: 0,
      }),
  });
}

export function useEndSession() {
  return useMutation({
    mutationFn: (data: { id: string; cardsSeen: number; cardsCorrect: number }) =>
      pb.collection("review_sessions").update<ReviewSession>(data.id, {
        ended_at: new Date().toISOString(),
        cards_seen: data.cardsSeen,
        cards_correct: data.cardsCorrect,
      }),
  });
}

export interface AnswerCardInput {
  question: Question;
  sessionId: string;
  rating: Rating;
  logId: string;
  durationMs: number;
}

// One card answered = one questions update (new scheduling state) plus one
// append-only review_logs create (see that migration's header comment for
// why it can never be edited/deleted). Runs client-side today; schedule()
// itself is pure so this could move into a pb_hooks server hook later
// without changing its interface — see scheduler/schedule.ts.
export function useAnswerCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ question, sessionId, rating, logId, durationMs }: AnswerCardInput) => {
      const before: CardState = {
        state: question.state,
        intervalDays: question.interval_days,
        easeFactor: question.ease_factor,
        repetitions: question.repetitions,
        lapses: question.lapses,
      };
      const now = new Date();
      const result = schedule(before, rating, now);

      await pb.collection("questions").update<Question>(question.id, {
        state: result.state,
        interval_days: result.intervalDays,
        ease_factor: result.easeFactor,
        repetitions: result.repetitions,
        lapses: result.lapses,
        due_at: result.dueAt.toISOString(),
        last_reviewed_at: now.toISOString(),
      });

      await pb.collection("review_logs").create<ReviewLog>({
        id: logId,
        user: pb.authStore.record!.id,
        question: question.id,
        session: sessionId,
        rating,
        state_before: before.state,
        interval_before: before.intervalDays,
        interval_after: result.intervalDays,
        ease_before: before.easeFactor,
        ease_after: result.easeFactor,
        duration_ms: durationMs,
        reviewed_at: now.toISOString(),
        scheduler_version: SCHEDULER_VERSION,
      });

      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["review-queue"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
