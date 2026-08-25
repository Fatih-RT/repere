import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "./pb";
import { useAuth } from "./auth";
import { useRestoreSubject, useRestoreChapter } from "./subjects";
import { useRestoreQuestion } from "./questions";
import type { Chapter, Question, Subject } from "./types";

export interface TrashData {
  subjects: Subject[];
  chapters: (Chapter & { subjectName: string })[];
  questions: (Question & { subjectName: string; chapterName: string })[];
}

export function useTrash() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["trash", user?.id],
    queryFn: async (): Promise<TrashData> => {
      const [trashedSubjects, trashedChapters, trashedQuestions, allSubjects, allChapters] = await Promise.all([
        pb.collection("subjects").getFullList<Subject>({ filter: "deleted_at != \"\"", sort: "-deleted_at" }),
        pb.collection("chapters").getFullList<Chapter>({ filter: "deleted_at != \"\"", sort: "-deleted_at" }),
        pb.collection("questions").getFullList<Question>({ filter: "deleted_at != \"\"", sort: "-deleted_at" }),
        // Unfiltered (active + trashed) so a trashed chapter/question can
        // still show its parent's name even if the parent isn't itself trashed.
        pb.collection("subjects").getFullList<Subject>(),
        pb.collection("chapters").getFullList<Chapter>(),
      ]);
      const subjectName = new Map(allSubjects.map((s) => [s.id, s.name]));
      const chapterName = new Map(allChapters.map((c) => [c.id, c.name]));
      return {
        subjects: trashedSubjects,
        chapters: trashedChapters.map((c) => ({ ...c, subjectName: subjectName.get(c.subject) ?? "?" })),
        questions: trashedQuestions.map((q) => ({ ...q, subjectName: subjectName.get(q.subject) ?? "?", chapterName: chapterName.get(q.chapter) ?? "?" })),
      };
    },
    enabled: !!user,
  });
}

export function useRestoreFromTrash() {
  const qc = useQueryClient();
  const restoreSubject = useRestoreSubject();
  const restoreChapter = useRestoreChapter();
  const restoreQuestion = useRestoreQuestion();

  async function restore(kind: "subject" | "chapter" | "question", id: string) {
    if (kind === "subject") await restoreSubject.mutateAsync(id);
    else if (kind === "chapter") await restoreChapter.mutateAsync(id);
    else await restoreQuestion.mutateAsync(id);
    qc.invalidateQueries({ queryKey: ["trash"] });
  }

  return { restore, isPending: restoreSubject.isPending || restoreChapter.isPending || restoreQuestion.isPending };
}
