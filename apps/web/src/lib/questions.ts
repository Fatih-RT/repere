import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "./pb";
import { masteryPct, newCardState } from "./scheduler";
import type { Question } from "./types";

export function questionStateLabel(q: Question, now: number = Date.now()): string {
  const dueAt = new Date(q.due_at).getTime();
  if (q.repetitions === 0 && q.state === "new") return "Jamais révisé";
  if (dueAt <= now) return "À revoir aujourd'hui";
  const daysLeft = Math.max(1, Math.round((dueAt - now) / 86400000));
  const plural = daysLeft > 1 ? "s" : "";
  return masteryPct(q.interval_days) >= 70
    ? `Bien maîtrisé · revoir dans ${daysLeft} jour${plural}`
    : `À revoir dans ${daysLeft} jour${plural}`;
}

export interface CreateQuestionInput {
  chapterId: string;
  subjectId: string;
  question: string;
  answer: string;
  questionImages?: File[];
  answerImages?: File[];
}

function invalidateAfterQuestionChange(qc: ReturnType<typeof useQueryClient>, question: Question) {
  qc.invalidateQueries({ queryKey: ["subjects"] });
  qc.invalidateQueries({ queryKey: ["subjects", question.subject] });
  qc.invalidateQueries({ queryKey: ["chapters", question.chapter] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["review-queue"] });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => {
      const card = newCardState();
      const now = new Date();
      const fd = new FormData();
      fd.append("user", pb.authStore.record!.id);
      fd.append("chapter", input.chapterId);
      fd.append("subject", input.subjectId);
      fd.append("question", input.question);
      fd.append("answer", input.answer);
      fd.append("suspended", "false");
      fd.append("state", card.state);
      fd.append("due_at", now.toISOString());
      fd.append("interval_days", String(card.intervalDays));
      fd.append("ease_factor", String(card.easeFactor));
      fd.append("repetitions", String(card.repetitions));
      fd.append("lapses", String(card.lapses));
      for (const f of input.questionImages ?? []) fd.append("question_images", f);
      for (const f of input.answerImages ?? []) fd.append("answer_images", f);
      return pb.collection("questions").create<Question>(fd);
    },
    onSuccess: (question) => invalidateAfterQuestionChange(qc, question),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; question?: string; answer?: string }) =>
      pb.collection("questions").update<Question>(id, data),
    onSuccess: (question) => invalidateAfterQuestionChange(qc, question),
  });
}

export function useSoftDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pb.collection("questions").update<Question>(id, { deleted_at: new Date().toISOString() }),
    onSuccess: (question) => invalidateAfterQuestionChange(qc, question),
  });
}

export function useRestoreQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pb.collection("questions").update<Question>(id, { deleted_at: "" }),
    onSuccess: (question) => invalidateAfterQuestionChange(qc, question),
  });
}

export function questionImageUrl(question: Question, filename: string): string {
  return pb.files.getURL(question, filename);
}
