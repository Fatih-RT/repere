import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateSubject, useSoftDeleteSubject, useSubjects, useUpdateSubject, useRestoreSubject } from "@/lib/subjects";
import { useTheme } from "@/theme/ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu } from "@/components/ui/Menu";
import { subjectHue } from "@/lib/visual";
import { relativeFr } from "@/lib/format";

const ICON_CHOICES = [
  "ph ph-function", "ph ph-scroll", "ph ph-atom", "ph ph-translate", "ph ph-brain",
  "ph ph-chart-line-up", "ph ph-book", "ph ph-flask", "ph ph-globe", "ph ph-palette",
];
const HUE_CHOICES = [352, 42, 210, 158, 288, 26, 190, 100];

function NewSubjectForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [hue, setHue] = useState(HUE_CHOICES[0]);
  const create = useCreateSubject();
  const { theme } = useTheme();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined, icon, hue });
    onDone();
  }

  return (
    <form onSubmit={submit} className="p-4 border border-border rounded-lg bg-surface mb-3 flex flex-col gap-3 animate-rise">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="block text-xs mb-1.5 text-muted">Nom</span>
          <Input required autoFocus placeholder="Mathématiques" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-xs mb-1.5 text-muted">Description (facultatif)</span>
          <Input placeholder="Terminale spécialité" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      <div>
        <span className="block text-xs mb-1.5 text-muted">Icône</span>
        <div className="flex flex-wrap gap-1.5">
          {ICON_CHOICES.map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => setIcon(i)}
              className="w-9 h-9 grid place-items-center rounded-md"
              style={{
                border: `1px solid ${i === icon ? "var(--accent)" : "var(--border)"}`,
                background: i === icon ? "var(--accent-soft)" : "transparent",
                color: i === icon ? "var(--accent)" : "var(--text)",
              }}
            >
              <i className={i} style={{ fontSize: 16 }} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-xs mb-1.5 text-muted">Couleur</span>
        <div className="flex flex-wrap gap-1.5">
          {HUE_CHOICES.map((h) => (
            <button
              type="button"
              key={h}
              onClick={() => setHue(h)}
              className="w-7 h-7 rounded-full"
              style={{
                background: subjectHue(h, true, theme === "dark"),
                outline: h === hue ? "2px solid var(--text)" : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="solid" disabled={create.isPending}>Créer la matière</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </form>
  );
}

export function SubjectsPage() {
  const { data: subjects, isLoading } = useSubjects();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const updateSubject = useUpdateSubject();
  const softDelete = useSoftDeleteSubject();
  const restore = useRestoreSubject();
  const isDark = theme === "dark";

  async function saveRename(id: string) {
    if (renameValue.trim()) await updateSubject.mutateAsync({ id, name: renameValue.trim() });
    setRenamingId(null);
  }

  async function deleteSubject(id: string, name: string) {
    // See ChapterDetailPage's deleteChapter for why this is awaited before
    // the undo toast is shown: otherwise a fast "Annuler" click can race
    // the restore PATCH against the delete PATCH and lose.
    await softDelete.mutateAsync(id);
    toast.showUndo(`« ${name} » déplacée dans la corbeille.`, () => restore.mutate(id));
  }

  const meta = subjects
    ? `${subjects.length} matière${subjects.length > 1 ? "s" : ""} · ${subjects.reduce((t, s) => t + s.questionsCount, 0)} questions · ${subjects.length ? Math.round(subjects.reduce((t, s) => t + s.mastery, 0) / subjects.length) : 0} % de maîtrise moyenne`
    : "";

  return (
    <div className="animate-fade">
      <div className="flex items-end gap-3.5 mb-5 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <h1 className="m-0 mb-1 text-2xl font-medium tracking-tight">Matières</h1>
          <p className="m-0 text-[13.5px] text-muted">{subjects?.length ? meta : "Aucune matière pour l'instant"}</p>
        </div>
        {!creating && (
          <Button variant="solid" onClick={() => setCreating(true)}>
            <i className="ph ph-plus" style={{ fontSize: 15 }} /> Nouvelle matière
          </Button>
        )}
      </div>

      {creating && <NewSubjectForm onDone={() => setCreating(false)} />}

      {isLoading ? (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))" }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[168px]" />)}
        </div>
      ) : !subjects?.length ? (
        <EmptyState
          icon="ph ph-books"
          title="Tu n'as encore aucune matière"
          description="Crée ta première matière, ajoute quelques questions, et Repère s'occupe du reste."
          action={<Button variant="solid" onClick={() => setCreating(true)}><i className="ph ph-plus" style={{ fontSize: 15 }} /> Créer ma première matière</Button>}
        />
      ) : (
        <div className="grid gap-[11px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))" }}>
          {subjects.map((s) => (
            <div key={s.id} className="p-4 border border-border rounded-lg bg-surface flex flex-col gap-[13px] animate-rise">
              <div className="flex items-start gap-[11px]">
                <div
                  className="w-[34px] h-[34px] flex-none rounded-md grid place-items-center"
                  style={{ color: subjectHue(s.hue, true, isDark), background: `color-mix(in srgb, ${subjectHue(s.hue, false, isDark)} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${subjectHue(s.hue, false, isDark)} 30%, transparent)` }}
                >
                  <i className={s.icon} style={{ fontSize: 17 }} />
                </div>
                <div className="flex-1 min-w-0">
                  {renamingId === s.id ? (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRename(s.id); if (e.key === "Escape") setRenamingId(null); }}
                        className="min-h-[30px] text-sm py-1"
                      />
                      <button type="button" onClick={() => saveRename(s.id)} className="w-6 h-6 flex-none grid place-items-center bg-transparent border-0" style={{ color: "var(--accent)" }}>
                        <i className="ph ph-check" style={{ fontSize: 15 }} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-[15.5px] font-medium tracking-tight">{s.name}</div>
                  )}
                  <div className="text-xs text-muted">{s.chaptersCount} chapitres · {s.questionsCount} questions</div>
                </div>
                <Menu
                  trigger={<i className="ph ph-dots-three" style={{ fontSize: 16 }} />}
                  items={[
                    { label: "Renommer", onClick: () => { setRenamingId(s.id); setRenameValue(s.name); } },
                    { label: "Supprimer", danger: true, onClick: () => deleteSubject(s.id, s.name) },
                  ]}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted">Maîtrise</span>
                  <span className="tabular-nums font-medium">{s.mastery}%</span>
                </div>
                <ProgressBar pct={s.mastery} color={subjectHue(s.hue, false, isDark)} />
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-[11.5px] flex-1" style={{ color: "var(--faint)" }}>{relativeFr(s.lastReviewedAt)}</span>
                <Button size="sm" onClick={() => navigate(`/subjects/${s.id}`)}>Ouvrir</Button>
                <Button size="sm" variant="solid" onClick={() => navigate("/review/session", { state: { mode: "due", subjectId: s.id } })}>Réviser</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
