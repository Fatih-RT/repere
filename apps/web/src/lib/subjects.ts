import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "./pb";
import { avgMastery } from "./scheduler";
import type { Chapter, Note, Question, Subject } from "./types";

export interface SubjectSummary extends Subject {
  chaptersCount: number;
  questionsCount: number;
  mastery: number;
  due: number;
  lastReviewedAt: string | null;
}

export interface ChapterSummary extends Chapter {
  questionsCount: number;
  mastery: number;
  due: number;
  lastReviewedAt: string | null;
}

// Only subjects/chapters have a `position` field (manual ordering) —
// questions sort by creation order only.
const SORT_BY_COLLECTION: Record<string, string> = {
  subjects: "position,created",
  chapters: "position,created",
  categories: "position,created",
  questions: "created",
};

export async function fetchActive<T>(collection: string, extraFilter?: string): Promise<T[]> {
  const filter = extraFilter ? `deleted_at = "" && ${extraFilter}` : `deleted_at = ""`;
  return pb.collection(collection).getFullList<T>({ filter, sort: SORT_BY_COLLECTION[collection] ?? "created" });
}

function lastReviewedOf(questions: Question[]): string | null {
  return questions.reduce<string | null>((acc, q) => {
    if (!q.last_reviewed_at) return acc;
    if (!acc || q.last_reviewed_at > acc) return q.last_reviewed_at;
    return acc;
  }, null);
}

function chapterSummary(chapter: Chapter, questions: Question[]): ChapterSummary {
  const now = Date.now();
  const chQuestions = questions.filter((q) => q.chapter === chapter.id);
  const due = chQuestions.filter((q) => new Date(q.due_at).getTime() <= now).length;
  return {
    ...chapter,
    questionsCount: chQuestions.length,
    mastery: avgMastery(chQuestions.map((q) => q.interval_days)),
    due,
    lastReviewedAt: lastReviewedOf(chQuestions),
  };
}

function subjectSummary(subject: Subject, chapters: Chapter[], questions: Question[]): SubjectSummary {
  const subjChapters = chapters.filter((c) => c.subject === subject.id);
  const chapterIds = new Set(subjChapters.map((c) => c.id));
  const subjQuestions = questions.filter((q) => chapterIds.has(q.chapter));
  const now = Date.now();
  const due = subjQuestions.filter((q) => new Date(q.due_at).getTime() <= now).length;
  return {
    ...subject,
    chaptersCount: subjChapters.length,
    questionsCount: subjQuestions.length,
    mastery: avgMastery(subjQuestions.map((q) => q.interval_days)),
    due,
    lastReviewedAt: lastReviewedOf(subjQuestions),
  };
}

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async (): Promise<SubjectSummary[]> => {
      const [subjects, chapters, questions] = await Promise.all([
        fetchActive<Subject>("subjects"),
        fetchActive<Chapter>("chapters"),
        fetchActive<Question>("questions"),
      ]);
      return subjects.map((s) => subjectSummary(s, chapters, questions));
    },
  });
}

export interface SubjectWithChapters extends SubjectSummary {
  chaptersList: ChapterSummary[];
}

// Whole library in one shot (subjects + their chapters), for screens that
// need the hierarchy — currently the Révisions hub's chapter picker.
export function useLibrary() {
  return useQuery({
    queryKey: ["subjects", "library"],
    queryFn: async (): Promise<SubjectWithChapters[]> => {
      const [subjects, chapters, questions] = await Promise.all([
        fetchActive<Subject>("subjects"),
        fetchActive<Chapter>("chapters"),
        fetchActive<Question>("questions"),
      ]);
      return subjects.map((s) => ({
        ...subjectSummary(s, chapters, questions),
        chaptersList: chapters.filter((c) => c.subject === s.id).map((c) => chapterSummary(c, questions)),
      }));
    },
  });
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: ["subjects", id],
    queryFn: async () => {
      const subject = await pb.collection("subjects").getOne<Subject>(id!);
      const [chapters, questions] = await Promise.all([
        fetchActive<Chapter>("chapters", pb.filter("subject = {:id}", { id })),
        fetchActive<Question>("questions", pb.filter("subject = {:id}", { id })),
      ]);
      const chaptersList = chapters.map((c) => chapterSummary(c, questions));
      const due = chaptersList.reduce((t, c) => t + c.due, 0);
      const last = questions.reduce<string | null>((acc, q) => {
        if (!q.last_reviewed_at) return acc;
        if (!acc || q.last_reviewed_at > acc) return q.last_reviewed_at;
        return acc;
      }, null);
      return {
        ...subject,
        chaptersCount: chaptersList.length,
        questionsCount: questions.length,
        mastery: avgMastery(questions.map((q) => q.interval_days)),
        due,
        lastReviewedAt: last,
        chaptersList,
      };
    },
    enabled: !!id,
  });
}

export function useChapter(id: string | undefined) {
  return useQuery({
    queryKey: ["chapters", id],
    queryFn: async () => {
      const chapter = await pb.collection("chapters").getOne<Chapter>(id!);
      const subject = await pb.collection("subjects").getOne<Subject>(chapter.subject);
      const questions = await fetchActive<Question>("questions", pb.filter("chapter = {:id}", { id }));
      return { ...chapterSummary(chapter, questions), subjectName: subject.name, questionsList: questions };
    },
    enabled: !!id,
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string; hue?: number; category?: string }) =>
      pb.collection("subjects").create<Subject>({
        user: pb.authStore.record!.id,
        description: "",
        icon: "ph ph-book",
        hue: 230,
        category: "",
        position: Date.now(),
        ...data,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; icon?: string; hue?: number; category?: string }) =>
      pb.collection("subjects").update<Subject>(id, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subjects", vars.id] });
    },
  });
}

export interface CascadeOp {
  collection: "subjects" | "chapters" | "questions" | "notes";
  id: string;
  deleted_at: string;
}

// Pure: the exact set of writes a subject-level soft-delete/restore must
// perform — the subject itself plus every one of its chapters, questions
// and notes, so they actually disappear from (or come back to) every
// "active" list. The schema's `cascadeDelete: true` only fires on a hard
// delete, never this soft one, hence doing it by hand here. Restoring a
// subject restores every child regardless of whether that specific child
// was trashed independently earlier — an accepted simplification for a
// personal, two-user app rather than tracking per-record "why was this
// deleted" provenance. Kept separate from the network calls so the actual
// fan-out logic is unit-testable — see subjects.test.ts.
export function buildSubjectCascadePlan(
  subjectId: string,
  chapters: { id: string }[],
  questions: { id: string }[],
  notes: { id: string }[],
  deletedAt: string
): CascadeOp[] {
  return [
    { collection: "subjects", id: subjectId, deleted_at: deletedAt },
    ...chapters.map((c) => ({ collection: "chapters" as const, id: c.id, deleted_at: deletedAt })),
    ...questions.map((q) => ({ collection: "questions" as const, id: q.id, deleted_at: deletedAt })),
    ...notes.map((n) => ({ collection: "notes" as const, id: n.id, deleted_at: deletedAt })),
  ];
}

async function runCascadePlan(plan: CascadeOp[]): Promise<void> {
  await Promise.all(plan.map((op) => pb.collection(op.collection).update(op.id, { deleted_at: op.deleted_at })));
}

export function useSoftDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const deleted_at = new Date().toISOString();
      const [chapters, questions, notes] = await Promise.all([
        fetchActive<Chapter>("chapters", pb.filter("subject = {:id}", { id })),
        fetchActive<Question>("questions", pb.filter("subject = {:id}", { id })),
        fetchActive<Note>("notes", pb.filter("subject = {:id}", { id })),
      ]);
      await runCascadePlan(buildSubjectCascadePlan(id, chapters, questions, notes, deleted_at));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useRestoreSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const [chapters, questions, notes] = await Promise.all([
        pb.collection("chapters").getFullList<Chapter>({ filter: pb.filter("subject = {:id} && deleted_at != \"\"", { id }) }),
        pb.collection("questions").getFullList<Question>({ filter: pb.filter("subject = {:id} && deleted_at != \"\"", { id }) }),
        pb.collection("notes").getFullList<Note>({ filter: pb.filter("subject = {:id} && deleted_at != \"\"", { id }) }),
      ]);
      await runCascadePlan(buildSubjectCascadePlan(id, chapters, questions, notes, ""));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useCreateChapter(subjectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      pb.collection("chapters").create<Chapter>({ user: pb.authStore.record!.id, subject: subjectId, name, position: Date.now() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      if (subjectId) qc.invalidateQueries({ queryKey: ["subjects", subjectId] });
    },
  });
}

export function useUpdateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => pb.collection("chapters").update<Chapter>(id, { name }),
    onSuccess: (chapter) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subjects", chapter.subject] });
      qc.invalidateQueries({ queryKey: ["chapters", chapter.id] });
    },
  });
}

// Same idea as buildSubjectCascadePlan, one level down: a chapter-level
// soft-delete/restore also touches every one of its own questions and notes.
export function buildChapterCascadePlan(chapterId: string, questions: { id: string }[], notes: { id: string }[], deletedAt: string): CascadeOp[] {
  return [
    { collection: "chapters", id: chapterId, deleted_at: deletedAt },
    ...questions.map((q) => ({ collection: "questions" as const, id: q.id, deleted_at: deletedAt })),
    ...notes.map((n) => ({ collection: "notes" as const, id: n.id, deleted_at: deletedAt })),
  ];
}

export function useSoftDeleteChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const deleted_at = new Date().toISOString();
      const [questions, notes] = await Promise.all([
        fetchActive<Question>("questions", pb.filter("chapter = {:id}", { id })),
        fetchActive<Note>("notes", pb.filter("chapter = {:id}", { id })),
      ]);
      await runCascadePlan(buildChapterCascadePlan(id, questions, notes, deleted_at));
      return pb.collection("chapters").getOne<Chapter>(id);
    },
    onSuccess: (chapter) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subjects", chapter.subject] });
    },
  });
}

export function useRestoreChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const [questions, notes] = await Promise.all([
        pb.collection("questions").getFullList<Question>({ filter: pb.filter("chapter = {:id} && deleted_at != \"\"", { id }) }),
        pb.collection("notes").getFullList<Note>({ filter: pb.filter("chapter = {:id} && deleted_at != \"\"", { id }) }),
      ]);
      await runCascadePlan(buildChapterCascadePlan(id, questions, notes, ""));
      return pb.collection("chapters").getOne<Chapter>(id);
    },
    onSuccess: (chapter) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subjects", chapter.subject] });
    },
  });
}
