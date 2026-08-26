import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb, pbDate } from "./pb";
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

export function useReviewQueue(params: QueueParams) {
  const { data: settings } = useSettings();
  const custom = !!params.chapterIds?.length;
  return useQuery({
    queryKey: ["review-queue", params.subjectId, params.chapterIds?.slice().sort().join(",")],
    queryFn: async (): Promise<Question[]> => {
      let baseFilter = `deleted_at = "" && suspended = false`;
      if (params.chapterIds?.length) {
        baseFilter += ` && (${params.chapterIds.map((id) => pb.filter("chapter = {:id}", { id })).join(" || ")})`;
      } else if (params.subjectId) {
        baseFilter += ` && ${pb.filter("subject = {:id}", { id: params.subjectId })}`;
      }
      // Due/new split (and the due_at <= now cutoff) happens server-side via
      // the filter, not by fetching every question and filtering in JS.
      const nowPb = pbDate(new Date());
      const [dueCards, newCards] = await Promise.all([
        pb.collection("questions").getFullList<Question>({
          filter: `${baseFilter} && state != "new" && ${pb.filter("due_at <= {:now}", { now: nowPb })}`,
          sort: "due_at",
        }),
        pb.collection("questions").getFullList<Question>({ filter: `${baseFilter} && state = "new"`, sort: "created" }),
      ]);

      if (custom) return [...dueCards, ...newCards];

      const dayStart = appDayStart(new Date(), settings!.timezone, settings!.day_cutoff_hour);
      const todayLogs = await pb.collection("review_logs").getFullList<ReviewLog>({
        filter: pb.filter("reviewed_at >= {:start}", { start: pbDate(dayStart) }),
        fields: "question,state_before,reviewed_at",
        sort: "reviewed_at",
      });
      // Counted per distinct question, not per log row: a card rated
      // "again" and reviewed again later the same day writes two logs but
      // must only consume one slot of today's budget. Bucketed by
      // whichever state_before it had the *first* time it was seen today.
      const seenToday = new Map<string, "new" | "review">();
      for (const log of todayLogs) {
        if (!log.question || seenToday.has(log.question)) continue;
        seenToday.set(log.question, log.state_before === "new" ? "new" : "review");
      }
      const newAlready = Array.from(seenToday.values()).filter((v) => v === "new").length;
      const reviewAlready = seenToday.size - newAlready;
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
        // Snapshotted now, not read back later — this is what keeps the log
        // readable after the question itself is gone (see the migration
        // that added these two fields for why the relation can end up empty).
        question_text: question.question,
        answer_text: question.answer,
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
