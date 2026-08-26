import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb, pbDate } from "./pb";
import { useAuth } from "./auth";
import { useSettings } from "./queries";
import { appDayKey, appDayStart } from "./day";
import type { PomodoroPhase, PomodoroSession } from "./types";

export interface LogPomodoroInput {
  phase: PomodoroPhase;
  plannedSeconds: number;
  actualSeconds: number;
  startedAt: Date;
  completed: boolean;
  subjectId?: string;
  chapterId?: string;
}

export function useLogPomodoroSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogPomodoroInput) =>
      pb.collection("pomodoro_sessions").create<PomodoroSession>({
        user: pb.authStore.record!.id,
        subject: input.subjectId ?? "",
        chapter: input.chapterId ?? "",
        phase: input.phase,
        planned_seconds: input.plannedSeconds,
        actual_seconds: Math.round(input.actualSeconds),
        started_at: input.startedAt.toISOString(),
        ended_at: new Date().toISOString(),
        completed: input.completed,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pomodoro-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function usePomodoroStats() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  return useQuery({
    queryKey: ["pomodoro-stats", user?.id],
    queryFn: async () => {
      const now = new Date();
      const tz = settings!.timezone;
      const cutoff = settings!.day_cutoff_hour;
      const todayKey = appDayKey(now, tz, cutoff);
      const weekStart = appDayStart(new Date(now.getTime() - 6 * 86400000), tz, cutoff);

      const sessions = await pb.collection("pomodoro_sessions").getFullList<PomodoroSession>({
        filter: pb.filter("started_at >= {:start} && phase = \"focus\"", { start: pbDate(weekStart) }),
        fields: "started_at,actual_seconds,completed",
      });

      let completedToday = 0;
      let secondsToday = 0;
      let secondsWeek = 0;
      for (const s of sessions) {
        secondsWeek += s.actual_seconds;
        if (appDayKey(new Date(s.started_at), tz, cutoff) === todayKey) {
          secondsToday += s.actual_seconds;
          if (s.completed) completedToday += 1;
        }
      }
      return { completedToday, minutesToday: Math.round(secondsToday / 60), minutesWeek: Math.round(secondsWeek / 60) };
    },
    enabled: !!user && !!settings,
  });
}
