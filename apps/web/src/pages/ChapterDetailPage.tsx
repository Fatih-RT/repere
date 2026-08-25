import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChapter } from "@/lib/subjects";
import { questionStateLabel, useSoftDeleteQuestion, useUpdateQuestion, useRestoreQuestion } from "@/lib/questions";
import { easeToDifficulty, masteryPct } from "@/lib/scheduler";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { DiffTag, Dot } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { MathText } from "@/components/MathText";
import type { Question } from "@/lib/types";

function EditQuestionRow({ q, onDone }: { q: Question; onDone: () => void }) {
  const [question, setQuestion] = useState(q.question);
  const [answer, setAnswer] = useState(q.answer);
  const updateQuestion = useUpdateQuestion();
  const softDelete = useSoftDeleteQuestion();
  const restore = useRestoreQuestion();
  const toast = useToast();

  async function save() {
    await updateQuestion.mutateAsync({ id: q.id, question, answer });
    onDone();
  }
  async function remove() {
    onDone();
    // Awaited first — see SubjectsPage's deleteSubject for why (avoids a
    // fast "Annuler" click racing the restore PATCH against this one).
    await softDelete.mutateAsync(q.id);
    toast.showUndo("Question déplacée dans la corbeille.", () => restore.mutate(q.id));
  }

  return (
    <div className="p-3.5 flex flex-col gap-2.5 bg-surface">
      <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="min-h-[60px] text-sm" />
      <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-h-[44px] text-sm" />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="solid" onClick={save}>Enregistrer</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
        <Button size="sm" variant="danger" className="ml-auto" onClick={remove}>Supprimer</Button>
      </div>
    </div>
  );
}

export function ChapterDetailPage() {
  const { subjectId, chapterId } = useParams();
  const { data: chapter, isLoading } = useChapter(chapterId);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<string | null>(null);

  if (isLoading || !chapter) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const now = Date.now();
  const isDue = (q: Question) => new Date(q.due_at).getTime() <= now;
  const questions = chapter.questionsList;
  const due = questions.filter(isDue).length;
  const ok = questions.filter((q) => !isDue(q) && masteryPct(q.interval_days) >= 70).length;
  const weak = questions.filter((q) => !isDue(q) && masteryPct(q.interval_days) < 40).length;
  const groups = [
    { label: "À revoir aujourd'hui", count: due, color: "var(--accent)" },
    { label: "Bien maîtrisé", count: ok, color: "var(--ok)" },
    { label: "À renforcer", count: weak, color: "var(--warn)" },
  ];

  return (
    <div className="animate-fade">
      <button
        type="button"
        onClick={() => navigate(`/subjects/${subjectId}`)}
        className="inline-flex items-center gap-1.5 py-1 mb-3.5 bg-transparent border-0 text-[12.5px]"
        style={{ color: "var(--muted)" }}
      >
        <i className="ph ph-arrow-left" style={{ fontSize: 13 }} /> {chapter.subjectName}
      </button>

      <div className="flex items-end gap-3.5 flex-wrap mb-5">
        <div className="flex-1 min-w-[180px]">
          <h1 className="m-0 mb-1 text-2xl font-medium tracking-tight">{chapter.name}</h1>
          <p className="m-0 text-[13.5px] text-muted">{chapter.questionsCount} questions · {chapter.mastery}% de maîtrise</p>
        </div>
        <Button variant="solid" onClick={() => navigate("/review/session", { state: { mode: "selection", chapterIds: [chapterId] } })}>
          <i className="ph ph-play" style={{ fontSize: 14 }} /> Réviser ce chapitre
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {groups.map((g) => (
          <div key={g.label} className="inline-flex items-center gap-2 px-3 py-[7px] rounded-md border border-border bg-surface">
            <Dot color={g.color} />
            <span className="text-[12.5px]">{g.label}</span>
            <span className="text-[12.5px] font-medium tabular-nums">{g.count}</span>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {questions.map((q, i) =>
          editing === q.id ? (
            <div key={q.id} style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
              <EditQuestionRow q={q} onDone={() => setEditing(null)} />
            </div>
          ) : (
            <div
              key={q.id}
              className="flex items-center gap-3 p-[12px_14px] bg-surface"
              style={{ borderTop: i ? "1px solid var(--border)" : "none" }}
            >
              <Dot color={isDue(q) ? "var(--accent)" : masteryPct(q.interval_days) >= 70 ? "var(--ok)" : "var(--warn)"} size={8} />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] mb-0.5"><MathText text={q.question} /></div>
                <div className="text-[11.5px]" style={{ color: "var(--faint)" }}>{questionStateLabel(q)}</div>
              </div>
              <DiffTag diff={easeToDifficulty(q.ease_factor)} />
              <button
                type="button"
                onClick={() => setEditing(q.id)}
                className="w-7 h-7 flex-none grid place-items-center bg-transparent border-0 rounded-md hover:bg-hover"
                style={{ color: "var(--faint)" }}
              >
                <i className="ph ph-pencil-simple" style={{ fontSize: 14 }} />
              </button>
            </div>
          )
        )}
        {questions.length === 0 && (
          <div className="p-4 flex items-center justify-between gap-3 bg-surface">
            <p className="text-sm text-muted m-0">Aucune question pour l'instant.</p>
            <Button size="sm" variant="solid" onClick={() => navigate("/create")}>
              <i className="ph ph-plus" style={{ fontSize: 13 }} /> Ajouter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
