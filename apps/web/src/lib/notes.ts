import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "./pb";
import { fetchActive } from "./subjects";
import type { Note } from "./types";

export function useNotes(subjectId: string | undefined) {
  return useQuery({
    queryKey: ["notes", subjectId],
    queryFn: () => fetchActive<Note>("notes", pb.filter("subject = {:id}", { id: subjectId })),
    enabled: !!subjectId,
  });
}

export interface CreateNoteInput {
  subjectId: string;
  chapterId?: string;
  title: string;
  content: string;
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) =>
      pb.collection("notes").create<Note>({
        user: pb.authStore.record!.id,
        subject: input.subjectId,
        chapter: input.chapterId ?? "",
        title: input.title,
        content: input.content,
        position: Date.now(),
      }),
    onSuccess: (note) => qc.invalidateQueries({ queryKey: ["notes", note.subject] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; content?: string; chapterId?: string }) =>
      pb.collection("notes").update<Note>(id, { title: data.title, content: data.content, chapter: data.chapterId }),
    onSuccess: (note) => qc.invalidateQueries({ queryKey: ["notes", note.subject] }),
  });
}

export function useSoftDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pb.collection("notes").update<Note>(id, { deleted_at: new Date().toISOString() }),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ["notes", note.subject] });
      qc.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useRestoreNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pb.collection("notes").update<Note>(id, { deleted_at: "" }),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ["notes", note.subject] });
      qc.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}
