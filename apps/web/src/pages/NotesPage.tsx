import { useMemo, useState } from "react";
import { useLibrary } from "@/lib/subjects";
import { useCategories } from "@/lib/categories";
import { useCreateNote, useNotes, useRestoreNote, useSoftDeleteNote, useUpdateNote } from "@/lib/notes";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Select, Textarea, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu } from "@/components/ui/Menu";
import { MathText } from "@/components/MathText";
import { FormulaHelpButton } from "@/components/FormulaHelpButton";
import { useToast } from "@/components/ui/Toast";
import { pbErrorMessage } from "@/lib/pbErrors";
import { subjectHue } from "@/lib/visual";
import type { Note } from "@/lib/types";

const ALL_CATEGORIES = "__all";
const NO_CHAPTER = "__none";

function NewNoteForm({
  subjectId,
  chapters,
  defaultChapterId,
  onDone,
}: {
  subjectId: string;
  chapters: { id: string; name: string }[];
  defaultChapterId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [chapterId, setChapterId] = useState(defaultChapterId || NO_CHAPTER);
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
      toast.show("Note ajoutée.");
      onDone();
    } catch (err) {
      setError(pbErrorMessage(err, "Impossible d'enregistrer la note."));
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
    toast.show("Note mise à jour.");
  }

  async function remove() {
    await softDelete.mutateAsync(note.id);
    toast.showUndo(`« ${note.title} » déplacée dans la corbeille.`, () => restoreNote.mutate(note.id));
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

export function NotesPage() {
  const { data: library, isLoading } = useLibrary();
  const { data: categories } = useCategories();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ subjectId: string; subjectName: string; chapterId: string } | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const filtered = useMemo(
    () => (categoryFilter === ALL_CATEGORIES ? library : library?.filter((s) => s.category === categoryFilter)),
    [library, categoryFilter]
  );

  const { data: notes } = useNotes(selected?.subjectId);
  const selectedSubject = filtered?.find((s) => s.id === selected?.subjectId);
  const chapterOptions = selectedSubject?.chaptersList.map((c) => ({ id: c.id, name: c.name })) ?? [];
  const chapterNameById = new Map(chapterOptions.map((c) => [c.id, c.name]));

  function select(subjectId: string, subjectName: string, chapterId: string) {
    setSelected({ subjectId, subjectName, chapterId });
    setShowNewForm(false);
  }

  return (
    <div className="animate-fade">
      <div className="flex items-end gap-3.5 flex-wrap mb-5">
        <div className="flex-1 min-w-[200px]">
          <h1 className="m-0 mb-1 text-2xl font-medium tracking-tight">Notes</h1>
          <p className="m-0 text-[13.5px] text-muted" style={{ textWrap: "pretty" }}>
            Tes cours, matière par matière — avec les mêmes formules que dans tes questions.
          </p>
        </div>
        {!!categories?.length && (
          <label className="block">
            <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setOpenSubject(null); }} className="min-w-[160px]">
              <option value={ALL_CATEGORIES}>Toutes les catégories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : !filtered?.length ? (
        <EmptyState
          icon="ph ph-note"
          title="Rien à annoter pour l'instant"
          description="Crée une matière et quelques chapitres, ils apparaîtront ici."
        />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-[9px] lg:w-[300px] lg:flex-none">
            {filtered.map((s) => {
              const open = openSubject === s.id;
              const hueStrong = subjectHue(s.hue, true, isDark);
              const hue = subjectHue(s.hue, false, isDark);
              return (
                <div key={s.id} className="rounded-xl overflow-hidden bg-surface" style={{ border: `1px solid ${open ? "var(--accent-line)" : "var(--border)"}` }}>
                  <button
                    type="button"
                    onClick={() => { setOpenSubject(open ? null : s.id); select(s.id, s.name, ""); }}
                    className="w-full flex items-center gap-[11px] p-[13px_14px] bg-transparent border-0 text-left"
                  >
                    <div
                      className="w-8 h-8 flex-none rounded-md grid place-items-center"
                      style={{ color: hueStrong, background: `color-mix(in srgb, ${hue} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${hue} 30%, transparent)` }}
                    >
                      <i className={s.icon} style={{ fontSize: 16 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-medium tracking-tight truncate">{s.name}</div>
                      <div className="text-[11.5px] text-muted truncate">{s.chaptersCount} chapitre{s.chaptersCount > 1 ? "s" : ""}</div>
                    </div>
                    <i className={open ? "ph ph-caret-up" : "ph ph-caret-down"} style={{ fontSize: 14, color: "var(--faint)" }} />
                  </button>
                  {open && (
                    <div>
                      {s.chaptersList.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => select(s.id, s.name, c.id)}
                          className="w-full flex items-center gap-2.5 p-[11px_14px] text-left border-0"
                          style={{ borderTop: "1px solid var(--border)", background: selected?.chapterId === c.id ? "var(--accent-soft)" : "transparent", color: "var(--text)" }}
                        >
                          <i className="ph ph-bookmark-simple" style={{ fontSize: 13, color: "var(--faint)" }} />
                          <span className="flex-1 min-w-0 text-[13.5px] truncate">{c.name}</span>
                        </button>
                      ))}
                      {s.chaptersList.length === 0 && (
                        <div className="p-[11px_14px] text-[12.5px]" style={{ borderTop: "1px solid var(--border)", color: "var(--faint)" }}>
                          Aucun chapitre pour l'instant.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-w-0">
            {!selected ? (
              <EmptyState icon="ph ph-cursor-click" title="Choisis une matière" description="Sélectionne une matière ou un chapitre à gauche pour voir ses notes." />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex-1 min-w-0 text-[14.5px] font-medium tracking-tight">
                    Notes — {selected.chapterId ? chapterNameById.get(selected.chapterId) ?? selected.subjectName : selected.subjectName}
                  </div>
                  <FormulaHelpButton />
                  {!showNewForm && (
                    <Button variant="solid" size="sm" onClick={() => setShowNewForm(true)}>
                      <i className="ph ph-plus" style={{ fontSize: 13 }} /> Nouvelle note
                    </Button>
                  )}
                </div>

                {showNewForm && (
                  <NewNoteForm
                    subjectId={selected.subjectId}
                    chapters={chapterOptions}
                    defaultChapterId={selected.chapterId}
                    onDone={() => setShowNewForm(false)}
                  />
                )}

                {!notes?.length ? (
                  <p className="m-0 text-[12.5px]" style={{ color: "var(--faint)" }}>Aucune note pour l'instant.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {notes.map((n) => (
                      <NoteCard key={n.id} note={n} chapterName={n.chapter ? chapterNameById.get(n.chapter) ?? "" : ""} chapters={chapterOptions} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
