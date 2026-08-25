import { pb } from "./pb";

// Collection rules already scope every list to `user = @request.auth.id`,
// so no explicit filter is needed here — this can only ever return the
// signed-in user's own records.
export async function buildExportData() {
  const [subjects, chapters, questions, reviewSessions, reviewLogs, pomodoroSessions, settings] = await Promise.all([
    pb.collection("subjects").getFullList(),
    pb.collection("chapters").getFullList(),
    pb.collection("questions").getFullList(),
    pb.collection("review_sessions").getFullList(),
    pb.collection("review_logs").getFullList(),
    pb.collection("pomodoro_sessions").getFullList(),
    pb.collection("user_settings").getFullList(),
  ]);
  return {
    exported_at: new Date().toISOString(),
    format_version: 1,
    subjects, chapters, questions,
    review_sessions: reviewSessions, review_logs: reviewLogs,
    pomodoro_sessions: pomodoroSessions, user_settings: settings,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
