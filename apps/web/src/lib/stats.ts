import { useQuery } from "@tanstack/react-query";
import { pb, pbDate } from "./pb";
import { useAuth } from "./auth";
import { useSettings } from "./queries";
import { useLibrary } from "./subjects";
import { appDayKey, appDayStart } from "./day";
import { masteryPct, easeToDifficulty } from "./scheduler";
import type { Question, ReviewLog } from "./types";

const TREND_WEEKS = 8;
const HEAT_DAYS = 70;

export interface StatsData {
  accuracy7d: number | null;
  accuracyDeltaPts: number | null;
  minutesWeek: number;
  minutesWeekDelta: number;
  masteredCount: number;
  totalActive: number;
  masteredNewThisWeek: number;
  hardCount: number;
  hardSubjectName: string | null;
  trendPoints: number[]; // 8 weekly accuracy % values, oldest -> newest
  heat: number[]; // 70 daily activity levels in [0,1], oldest -> newest
}

// `categoryId` scopes the question-derived numbers (mastered/hard counts,
// the subject list) to one cursus. Account-wide activity that isn't
// reliably attributable to a subject — accuracy trend, minutes worked,
// the regularity heatmap — stays global regardless of the filter: sessions
// and pomodoros are frequently cross-subject ("due" mode), and filtering
// them would mean guessing rather than measuring. This is deliberately not
// a new analysis dimension, just narrowing the parts that were always
// subject-scoped in the first place.
export function useStats(categoryId?: string) {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { data: library } = useLibrary();

  return useQuery({
    queryKey: ["stats", user?.id, categoryId],
    queryFn: async (): Promise<StatsData> => {
      const now = new Date();
      const tz = settings!.timezone;
      const cutoff = settings!.day_cutoff_hour;
      const trendStart = appDayStart(new Date(now.getTime() - (TREND_WEEKS * 7 - 1) * 86400000), tz, cutoff);
      const heatStart = appDayStart(new Date(now.getTime() - (HEAT_DAYS - 1) * 86400000), tz, cutoff);
      const earliestStart = trendStart.getTime() < heatStart.getTime() ? trendStart : heatStart;

      const [logs, questions, pomos, sessions] = await Promise.all([
        pb.collection("review_logs").getFullList<ReviewLog>({
          filter: pb.filter("reviewed_at >= {:start}", { start: pbDate(earliestStart) }),
          fields: "rating,reviewed_at",
        }),
        pb.collection("questions").getFullList<Question>({ filter: "deleted_at = \"\" && suspended = false" }),
        pb.collection("pomodoro_sessions").getFullList<{ started_at: string; actual_seconds: number }>({
          filter: pb.filter("started_at >= {:start} && phase = \"focus\"", { start: pbDate(appDayStart(new Date(now.getTime() - 13 * 86400000), tz, cutoff)) }),
          fields: "started_at,actual_seconds",
        }),
        pb.collection("review_sessions").getFullList<{ started_at: string; ended_at: string }>({
          filter: pb.filter("started_at >= {:start} && ended_at != \"\"", { start: pbDate(appDayStart(new Date(now.getTime() - 13 * 86400000), tz, cutoff)) }),
          fields: "started_at,ended_at",
        }),
      ]);

      // --- accuracy this week vs previous week ---
      const dayOffsetOf = (iso: string) => Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
      const thisWeekLogs = logs.filter((l) => dayOffsetOf(l.reviewed_at) < 7);
      const prevWeekLogs = logs.filter((l) => dayOffsetOf(l.reviewed_at) >= 7 && dayOffsetOf(l.reviewed_at) < 14);
      const accOf = (list: ReviewLog[]) => (list.length ? Math.round((list.filter((l) => l.rating === "good").length / list.length) * 100) : null);
      const accuracy7d = accOf(thisWeekLogs);
      const accuracyPrev = accOf(prevWeekLogs);
      const accuracyDeltaPts = accuracy7d !== null && accuracyPrev !== null ? accuracy7d - accuracyPrev : null;

      // --- minutes this week vs previous week ---
      const minutesInRange = (fromDayOffset: number, toDayOffset: number) => {
        let total = 0;
        for (const p of pomos) {
          const off = dayOffsetOf(p.started_at);
          if (off >= fromDayOffset && off < toDayOffset) total += p.actual_seconds / 60;
        }
        for (const s of sessions) {
          const off = dayOffsetOf(s.started_at);
          if (off >= fromDayOffset && off < toDayOffset) total += Math.max(0, (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
        }
        return Math.round(total);
      };
      const minutesWeek = minutesInRange(0, 7);
      const minutesWeekDelta = minutesWeek - minutesInRange(7, 14);

      // --- mastery (scoped to the selected category, if any) ---
      const categorySubjectIds = categoryId ? new Set((library ?? []).filter((s) => s.category === categoryId).map((s) => s.id)) : null;
      const scopedQuestions = categorySubjectIds ? questions.filter((q) => categorySubjectIds.has(q.subject)) : questions;
      const masteredCount = scopedQuestions.filter((q) => masteryPct(q.interval_days) >= 70).length;
      const masteredNewThisWeek = scopedQuestions.filter((q) => masteryPct(q.interval_days) >= 70 && q.last_reviewed_at && dayOffsetOf(q.last_reviewed_at) < 7).length;
      const hardQuestions = scopedQuestions.filter((q) => easeToDifficulty(q.ease_factor) === "Difficile");
      const hardBySubject = new Map<string, number>();
      for (const q of hardQuestions) hardBySubject.set(q.subject, (hardBySubject.get(q.subject) ?? 0) + 1);
      let hardSubjectName: string | null = null;
      if (hardBySubject.size > 0) {
        const topSubjectId = Array.from(hardBySubject.entries()).sort((a, b) => b[1] - a[1])[0][0];
        hardSubjectName = library?.find((s) => s.id === topSubjectId)?.name ?? null;
      }

      // --- 8-week accuracy trend ---
      const trendPoints: number[] = [];
      for (let w = TREND_WEEKS - 1; w >= 0; w--) {
        const from = w * 7, to = from + 7;
        const bucket = logs.filter((l) => { const off = dayOffsetOf(l.reviewed_at); return off >= from && off < to; });
        trendPoints.push(accOf(bucket) ?? 0);
      }

      // --- 70-day activity heat strip (oldest -> newest) ---
      const countByDay = new Map<string, number>();
      for (const l of logs) {
        const key = appDayKey(new Date(l.reviewed_at), tz, cutoff);
        countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
      }
      const dailyCounts: number[] = [];
      for (let d = HEAT_DAYS - 1; d >= 0; d--) {
        const key = appDayKey(new Date(now.getTime() - d * 86400000), tz, cutoff);
        dailyCounts.push(countByDay.get(key) ?? 0);
      }
      const maxDay = Math.max(1, ...dailyCounts);
      const heat = dailyCounts.map((c) => c / maxDay);

      return {
        accuracy7d, accuracyDeltaPts, minutesWeek, minutesWeekDelta,
        masteredCount, totalActive: scopedQuestions.length, masteredNewThisWeek,
        hardCount: hardQuestions.length, hardSubjectName,
        trendPoints, heat,
      };
    },
    enabled: !!user && !!settings && !!library,
  });
}
