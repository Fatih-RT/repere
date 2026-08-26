import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateChapter, useSoftDeleteChapter, useSubject, useUpdateChapter, useRestoreChapter } from "@/lib/subjects";
import { useCreateNote, useNotes, useRestoreNote, useSoftDeleteNote, useUpdateNote } from "@/lib/notes";
import { useTheme } from "@/theme/ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { pbErrorMessage } from "@/lib/pbErrors";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DueTag } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Menu } from "@/components/ui/Menu";
import { MathText } from "@/components/MathText";
import { FormulaHelpButton } from "@/components/FormulaHelpButton";
import { subjectHue } from "@/lib/visual";
import { relativeFr } from "@/lib/format";
import type { Note } from "@/lib/types";

const NO_CHAPTER = "__none";

function NewNoteForm({
  subjectId,
  chapters,
  onDone,
}: {
  subjectId: string;
  chapters: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [chapterId, setChapterId] = useState(NO_CHAPTER);
  const [error, setError] = useState<string | null>(null);
  const createNote = useCreateNote();
  const toast = useToast();

  async function submit() {
    if (!title.trim()) return setError("Donne un titre à ce cours.");
    if (!content.trim()) return setError("Le contenu ne peut pas être vide.");
    try {
      await createNote.mutateAsync({
        subjectId,
        chapterId: chapterId === NO_CHAPTER ? undefined : chapterId,
        title: title.trim(),
        content,
      });
      toast.show("Cours ajouté.");
      onDone();
    } catch (err) {
      setError(pbErrorMessage(err, "Impossible d'enregistrer le cours."));
    }
  }

  return (
    <div className="p-[15px] border rounded-lg bg-surface flex flex-col gap-2.5 animate-rise" style={{ borderColor: "var(--accent-line)" }}>
      <label className="block">
        <span className="block text-xs mb-1.5 text-muted">Titre</span>
        <Input autoFocus placeholder="Les acides et les bases" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      {chapters.length > 0 && (
        <label className="block">
          <span className="block text-xs mb-1.5 text-muted">Chapitre</span>
          <Select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            <option value={NO_CHAPTER}>Toute la matière</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </label>
      )}
      <label className="block">
        <span className="block text-xs mb-1.5 text-muted">
          Contenu <span style={{ color: "var(--faint)" }}>· $\LaTeX$ et \ce{"{H2O}"} pour la chimie</span>
        </span>
        <Textarea className="min-h-[160px] text-[14px]" placeholder="Le pH mesure $-\log_{10}[H^+]$…" value={content} onChange={(e) => setContent(e.target.value)} />
        {content.trim() && (
          <div className="mt-2 p-2.5 rounded-md text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
            <MathText text={content} />
          </div>
        )}
      </label>
      <div className="flex items-center gap-2.5 flex-wrap mt-1">
        <FormulaHelpButton />
        <span className="ml-auto flex gap-2">
          <Button size="sm" onClick={onDone}>Annuler</Button>
          <Button variant="solid" size="sm" onClick={submit} disabled={createNote.isPending}>Enregistrer</Button>
        </span>
      </div>
      {error && <p className="m-0 text-[12.5px]" style={{ color: "var(--err)" }}>{error}</p>}
    </div>
  );
}

function NoteCard({ note, chapterName, chapters }: { note: Note; chapterName: string; chapters: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [chapterId, setChapterId] = useState(note.chapter || NO_CHAPTER);
  const updateNote = useUpdateNote();
  const softDelete = useSoftDeleteNote();
  const restoreNote = useRestoreNote();
  const toast = useToast();

  async function save() {
    if (!title.trim() || !content.trim()) return;
    await updateNote.mutateAsync({ id: note.id, title: title.trim(), content, chapterId: chapterId === NO_CHAPTER ? "" : chapterId });
    setEditing(false);
    toast.show("Cours mis à jour.");
  }

  async function remove() {
    await softDelete.mutateAsync(note.id);
    toast.showUndo(`« ${note.title} » déplacé dans la corbeille.`, () => restoreNote.mutate(note.id));
  }

  if (editing) {
    return (
      <div className="p-[15px] border rounded-lg bg-surface flex flex-col gap-2.5" style={{ borderColor: "var(--accent-line)" }}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        {chapters.length > 0 && (
          <Select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            <option value={NO_CHAPTER}>Toute la matière</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        <Textarea className="min-h-[140px] text-[14px]" value={content} onChange={(e) => setContent(e.target.value)} />
        {content.trim() && (
          <div className="p-2.5 rounded-md text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
            <MathText text={content} />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button size="sm" onClick={() => setEditing(false)}>Annuler</Button>
          <Button variant="solid" size="sm" onClick={save} disabled={updateNote.isPending}><i className="ph ph-check" style={{ fontSize: 13 }} /> Enregistrer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-[15px] border border-border rounded-lg bg-surface">
      <div className="flex items-start gap-2.5 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium tracking-tight">{note.title}</div>
          {chapterName && <div className="text-[11px] mt-0.5" style={{ color: "var(--faint)" }}>{chapterName}</div>}
        </div>
        <Menu
          trigger={<i className="ph ph-dots-three" style={{ fontSize: 18 }} />}
          items={[
            { label: "Modifier", onClick: () => setEditing(true) },
            { label: "Supprimer", danger: true, onClick: remove },
          ]}
        />
      </div>
      <div className="text-[13.5px] leading-[1.55]" style={{ whiteSpace: "pre-wrap" }}>
        <MathText text={note.content} />
      </div>
    </div>
  );
}

export function SubjectDetailPage() {
  const { subjectId } = useParams();
  const { data: subject, isLoading } = useSubject(subjectId);
  const createChapter = useCreateChapter(subjectId);
  const updateChapter = useUpdateChapter();
  const softDeleteChapter = useSoftDeleteChapter();
  const restoreChapter = useRestoreChapter();
  const { data: notes } = useNotes(subjectId);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const [addingChapter, setAddingChapter] = useState(false);
  const [chapterName, setChapterName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewNote, setShowNewNote] = useState(false);
  const isDark = theme === "dark";

  if (isLoading || !subject) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  async function submitChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!chapterName.trim()) return;
    await createChapter.mutateAsync(chapterName.trim());
    setChapterName("");
    setAddingChapter(false);
  }

  async function saveRename(id: string) {
    if (renameValue.trim()) await updateChapter.mutateAsync({ id, name: renameValue.trim() });
    setRenamingId(null);
  }

  async function deleteChapter(id: string, name: string) {
    // Wait for the delete to actually land before the undo button becomes
    // clickable — otherwise a fast "Annuler" click can fire the restore
    // PATCH before the delete PATCH resolves, and the two can land out of
    // order (undo silently loses the race).
    await softDeleteChapter.mutateAsync(id);
    toast.showUndo(`« ${name} » déplacé dans la corbeille.`, () => restoreChapter.mutate(id));
  }

  return (
    <div className="animate-fade">
      <button
        type="button"
        onClick={() => navigate("/subjects")}
        className="inline-flex items-center gap-1.5 py-1 mb-3.5 bg-transparent border-0 text-[12.5px]"
        style={{ color: "var(--muted)" }}
      >
        <i className="ph ph-arrow-left" style={{ fontSize: 13 }} /> Matières
      </button>

      <div className="flex items-start gap-3.5 flex-wrap mb-5">
        <div
          className="w-10 h-10 flex-none rounded-md grid place-items-center"
          style={{ color: subjectHue(subject.hue, true, isDark), background: `color-mix(in srgb, ${subjectHue(subject.hue, false, isDark)} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${subjectHue(subject.hue, false, isDark)} 30%, transparent)` }}
        >
          <i className={subject.icon} style={{ fontSize: 19 }} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="m-0 mb-1 text-[25px] font-medium tracking-tight">{subject.name}</h1>
          <p className="m-0 text-[13.5px] text-muted" style={{ textWrap: "pretty" }}>{subject.description}</p>
        </div>
        <Button variant="solid" onClick={() => navigate("/review/session", { state: { mode: "due", subjectId: subject.id } })}>
          <i className="ph ph-play" style={{ fontSize: 14 }} /> Réviser la matière
        </Button>
      </div>

      <div className="grid gap-2.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))" }}>
        {[
          { label: "Maîtrise", value: subject.mastery, unit: "%" },
          { label: "Questions", value: subject.questionsCount, unit: "" },
          { label: "À revoir", value: subject.due, unit: "aujourd'hui" },
          { label: "Dernière révision", value: relativeFr(subject.lastReviewedAt).replace(/^Révisé /, ""), unit: "" },
        ].map((s) => (
          <div key={s.label} className="p-[13px_14px] border border-border rounded-lg bg-surface">
            <div className="text-[11.5px] text-muted mb-[7px]">{s.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-medium tracking-tight tabular-nums leading-none">{s.value}</span>
              <span className="text-xs" style={{ color: "var(--faint)" }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 mb-[11px]">
        <h2 className="m-0 text-base font-medium">Chapitres</h2>
        <span className="text-xs" style={{ color: "var(--faint)" }}>{subject.chaptersCount}</span>
        {!addingChapter && (
          <Button size="sm" className="ml-auto" onClick={() => setAddingChapter(true)}>
            <i className="ph ph-plus" style={{ fontSize: 13 }} /> Chapitre
          </Button>
        )}
      </div>

      {addingChapter && (
        <form onSubmit={submitChapter} className="flex gap-2 mb-3 animate-rise">
          <Input autoFocus placeholder="Nom du chapitre" value={chapterName} onChange={(e) => setChapterName(e.target.value)} className="max-w-xs" />
          <Button type="submit" variant="solid" disabled={createChapter.isPending}>Ajouter</Button>
          <Button type="button" variant="ghost" onClick={() => setAddingChapter(false)}>Annuler</Button>
        </form>
      )}

      <div className="flex flex-col gap-[7px]">
        {subject.chaptersList.map((c) =>
          renamingId === c.id ? (
            <div key={c.id} className="flex items-center gap-2 p-[13px_14px] border rounded-lg bg-surface" style={{ borderColor: "var(--accent-line)" }}>
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveRename(c.id); if (e.key === "Escape") setRenamingId(null); }}
                className="min-h-[34px]"
              />
              <Button size="sm" variant="solid" onClick={() => saveRename(c.id)}>Enregistrer</Button>
              <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>Annuler</Button>
            </div>
          ) : (
            <div key={c.id} className="flex items-center gap-1 border border-border rounded-lg bg-surface hover:bg-hover">
              <button
                type="button"
                onClick={() => navigate(`/subjects/${subject.id}/chapters/${c.id}`)}
                className="flex-1 min-w-0 flex items-center gap-[13px] p-[13px_14px] bg-transparent border-0 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-medium tracking-tight mb-0.5">{c.name}</div>
                  <div className="text-xs text-muted">{c.questionsCount} questions · {relativeFr(c.lastReviewedAt)}</div>
                </div>
                {c.due > 0 && <DueTag due={c.due} />}
                <div className="w-[76px] flex-none">
                  <ProgressBar pct={c.mastery} height={4} color={subjectHue(subject.hue, false, isDark)} />
                </div>
                <span className="text-[12.5px] tabular-nums w-[34px] text-right" style={{ color: "var(--faint)" }}>{c.mastery}%</span>
                <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--faint)" }} />
              </button>
              <Menu
                trigger={<i className="ph ph-dots-three" style={{ fontSize: 16 }} />}
                items={[
                  { label: "Renommer", onClick: () => { setRenamingId(c.id); setRenameValue(c.name); } },
                  { label: "Supprimer", danger: true, onClick: () => deleteChapter(c.id, c.name) },
                ]}
              />
              <div className="w-2" />
            </div>
          )
        )}
        {subject.chaptersList.length === 0 && <p className="text-sm text-muted">Aucun chapitre pour l'instant.</p>}
      </div>

      <div className="flex items-center gap-2.5 mb-[11px] mt-7">
        <h2 className="m-0 text-base font-medium">Cours</h2>
        <span className="text-xs" style={{ color: "var(--faint)" }}>{notes?.length ?? 0}</span>
        <FormulaHelpButton />
        {!showNewNote && (
          <Button size="sm" className="ml-auto" onClick={() => setShowNewNote(true)}>
            <i className="ph ph-plus" style={{ fontSize: 13 }} /> Cours
          </Button>
        )}
      </div>

      {showNewNote && (
        <div className="mb-3">
          <NewNoteForm
            subjectId={subject.id}
            chapters={subject.chaptersList.map((c) => ({ id: c.id, name: c.name }))}
            onDone={() => setShowNewNote(false)}
          />
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {notes?.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            chapterName={n.chapter ? subject.chaptersList.find((c) => c.id === n.chapter)?.name ?? "" : ""}
            chapters={subject.chaptersList.map((c) => ({ id: c.id, name: c.name }))}
          />
        ))}
        {!notes?.length && !showNewNote && <p className="text-sm text-muted">Aucun cours pour l'instant.</p>}
      </div>
    </div>
  );
}
