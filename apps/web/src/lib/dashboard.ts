import { useQuery } from "@tanstack/react-query";
import { pb } from "./pb";
import { useAuth } from "./auth";
import { useSettings } from "./queries";
import { useLibrary } from "./subjects";
import { appDayKey, appDayStart } from "./day";
import { computeStreak } from "./streak";
import { easeToDifficulty } from "./scheduler";
import type { Difficulty, PomodoroSession, Question, ReviewLog, ReviewSession } from "./types";

const WEEKDAY_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export interface DueChapterSummary {
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  hue: number;
  count: number;
  diff: Difficulty;
  pct: number;
}

export interface DashboardData {
  dueCount: number;
  dueChapters: DueChapterSummary[];
  accuracy7d: number | null;
  studiedTodayMinutes: number;
  streak: { current: number; activeDaysLast30: number };
  goalTotalMinutes: number;
  weekBars: { day: string; minutes: number; isToday: boolean }[];
  subjectProgress: { name: string; hue: number; pct: number }[];
}

export function useDashboard() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { data: library } = useLibrary();

  return useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async (): Promise<DashboardData> => {
      const now = new Date();
      const tz = settings!.timezone;
      const cutoff = settings!.day_cutoff_hour;
      const todayKey = appDayKey(now, tz, cutoff);
      const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
      const weekStart = appDayStart(sevenDaysAgo, tz, cutoff);

      const [dueQuestions, recentLogs, allReviewedDates, pomos, sessions] = await Promise.all([
        pb.collection("questions").getFullList<Question>({
          filter: pb.filter("deleted_at = \"\" && suspended = false && due_at <= {:now}", { now: now.toISOString() }),
        }),
        pb.collection("review_logs").getFullList<ReviewLog>({
          filter: pb.filter("reviewed_at >= {:start}", { start: weekStart.toISOString() }),
          fields: "rating,reviewed_at",
        }),
        pb.collection("review_logs").getFullList<ReviewLog>({ fields: "reviewed_at", sort: "-reviewed_at" }),
        pb.collection("pomodoro_sessions").getFullList<PomodoroSession>({
          filter: pb.filter("started_at >= {:start} && phase = \"focus\"", { start: weekStart.toISOString() }),
          fields: "started_at,actual_seconds",
        }),
        pb.collection("review_sessions").getFullList<ReviewSession>({
          filter: pb.filter("started_at >= {:start} && ended_at != \"\"", { start: weekStart.toISOString() }),
          fields: "started_at,ended_at",
        }),
      ]);

      // Group due questions by chapter for the "à réviser aujourd'hui" list.
      const byChapter = new Map<string, Question[]>();
      for (const q of dueQuestions) {
        const list = byChapter.get(q.chapter) ?? [];
        list.push(q);
        byChapter.set(q.chapter, list);
      }
      const dueChapters: DueChapterSummary[] = [];
      for (const s of library ?? []) {
        for (const c of s.chaptersList) {
          const qs = byChapter.get(c.id);
          if (!qs?.length) continue;
          const minEase = Math.min(...qs.map((q) => q.ease_factor));
          dueChapters.push({
            subjectId: s.id, subjectName: s.name, chapterId: c.id, chapterName: c.name,
            hue: s.hue, count: qs.length, diff: easeToDifficulty(minEase), pct: c.mastery,
          });
        }
      }
      dueChapters.sort((a, b) => b.count - a.count);

      // Minutes worked per app-day, from pomodoro focus time + finished
      // review sessions, bucketed over the last 7 days for the week chart.
      const minutesByDay = new Map<string, number>();
      for (const p of pomos) {
        const key = appDayKey(new Date(p.started_at), tz, cutoff);
        minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + p.actual_seconds / 60);
      }
      for (const s of sessions) {
        const key = appDayKey(new Date(s.started_at), tz, cutoff);
        const mins = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000;
        minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + Math.max(0, mins));
      }
      const weekBars = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getTime() - (6 - i) * 86400000);
        const key = appDayKey(d, tz, cutoff);
        return { day: WEEKDAY_FR[d.getDay()], minutes: Math.round(minutesByDay.get(key) ?? 0), isToday: key === todayKey };
      });
      const studiedTodayMinutes = Math.round(minutesByDay.get(todayKey) ?? 0);

      const accuracy7d = recentLogs.length > 0
        ? Math.round((recentLogs.filter((l) => l.rating === "good").length / recentLogs.length) * 100)
        : null;

      const streak = computeStreak(allReviewedDates.map((l) => l.reviewed_at), now, tz, cutoff);

      const subjectProgress = (library ?? [])
        .slice()
        .sort((a, b) => b.questionsCount - a.questionsCount)
        .slice(0, 5)
        .map((s) => ({ name: s.name, hue: s.hue, pct: s.mastery }));

      return {
        dueCount: dueQuestions.length,
        dueChapters,
        accuracy7d,
        studiedTodayMinutes,
        streak,
        goalTotalMinutes: settings!.daily_goal_mins,
        weekBars,
        subjectProgress,
      };
    },
    enabled: !!user && !!settings && !!library,
  });
}
