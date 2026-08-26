import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateSubject, useSoftDeleteSubject, useSubjects, useUpdateSubject, useRestoreSubject, type SubjectSummary } from "@/lib/subjects";
import {
  useCategories, useCreateCategory, useUpdateCategory, useSoftDeleteCategory, useRestoreCategory,
  useSwapCategoryPosition, groupByCategory,
} from "@/lib/categories";
import { useTheme } from "@/theme/ThemeProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu } from "@/components/ui/Menu";
import { subjectHue } from "@/lib/visual";
import { relativeFr } from "@/lib/format";
import type { Category } from "@/lib/types";

const ICON_CHOICES = [
  "ph ph-function", "ph ph-scroll", "ph ph-atom", "ph ph-translate", "ph ph-brain",
  "ph ph-chart-line-up", "ph ph-book", "ph ph-flask", "ph ph-globe", "ph ph-palette",
];
const HUE_CHOICES = [352, 42, 210, 158, 288, 26, 190, 100];
const CATEGORY_ICON_CHOICES = ["ph ph-graduation-cap", "ph ph-certificate", "ph ph-briefcase", "ph ph-heart", "ph ph-books"];
const NO_CATEGORY = "__none";

function IconPicker({ value, onChange, choices }: { value: string; onChange: (v: string) => void; choices: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {choices.map((i) => (
        <button
          type="button"
          key={i}
          onClick={() => onChange(i)}
          className="w-9 h-9 grid place-items-center rounded-md"
          style={{
            border: `1px solid ${i === value ? "var(--accent)" : "var(--border)"}`,
            background: i === value ? "var(--accent-soft)" : "transparent",
            color: i === value ? "var(--accent)" : "var(--text)",
          }}
        >
          <i className={i} style={{ fontSize: 16 }} />
        </button>
      ))}
    </div>
  );
}

function HuePicker({ value, onChange, isDark }: { value: number; onChange: (h: number) => void; isDark: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {HUE_CHOICES.map((h) => (
        <button
          type="button"
          key={h}
          onClick={() => onChange(h)}
          className="w-7 h-7 rounded-full"
          style={{ background: subjectHue(h, true, isDark), outline: h === value ? "2px solid var(--text)" : "none", outlineOffset: 2 }}
        />
      ))}
    </div>
  );
}

function CategorySelect({ value, onChange, categories }: { value: string; onChange: (v: string) => void; categories: Category[] }) {
  return (
    <Select value={value || NO_CATEGORY} onChange={(e) => onChange(e.target.value === NO_CATEGORY ? "" : e.target.value)}>
      <option value={NO_CATEGORY}>Aucune</option>
      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </Select>
  );
}

function NewSubjectForm({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [hue, setHue] = useState(HUE_CHOICES[0]);
  const [category, setCategory] = useState("");
  const create = useCreateSubject();
  const { theme } = useTheme();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined, icon, hue, category });
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
      {categories.length > 0 && (
        <label className="block max-w-xs">
          <span className="block text-xs mb-1.5 text-muted">Catégorie</span>
          <CategorySelect value={category} onChange={setCategory} categories={categories} />
        </label>
      )}
      <div>
        <span className="block text-xs mb-1.5 text-muted">Icône</span>
        <IconPicker value={icon} onChange={setIcon} choices={ICON_CHOICES} />
      </div>
      <div>
        <span className="block text-xs mb-1.5 text-muted">Couleur</span>
        <HuePicker value={hue} onChange={setHue} isDark={theme === "dark"} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="solid" disabled={create.isPending}>Créer la matière</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </form>
  );
}

function CategoryManager({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(CATEGORY_ICON_CHOICES[0]);
  const [newHue, setNewHue] = useState(HUE_CHOICES[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editHue, setEditHue] = useState(0);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const softDelete = useSoftDeleteCategory();
  const restore = useRestoreCategory();
  const swapPosition = useSwapCategoryPosition();

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createCategory.mutateAsync({ name: newName.trim(), icon: newIcon, hue: newHue });
    setNewName("");
    setNewIcon(CATEGORY_ICON_CHOICES[0]);
    setNewHue(HUE_CHOICES[0]);
    setAdding(false);
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditIcon(c.icon);
    setEditHue(c.hue);
  }

  async function saveEdit(id: string) {
    if (editName.trim()) await updateCategory.mutateAsync({ id, name: editName.trim(), icon: editIcon, hue: editHue });
    setEditingId(null);
  }

  async function deleteCategory(c: Category) {
    await softDelete.mutateAsync(c.id);
    toast.showUndo(`« ${c.name} » déplacée dans la corbeille.`, () => restore.mutate(c.id));
  }

  function move(index: number, dir: -1 | 1) {
    const target = categories[index + dir];
    if (!target) return;
    swapPosition.mutate({ a: categories[index], b: target });
  }

  return (
    <div className="mb-4 p-4 border border-border rounded-lg bg-surface animate-rise">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13.5px] font-medium">Catégories</span>
        <Button size="sm" variant="ghost" onClick={onDone}>Fermer</Button>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {categories.map((c, i) =>
            editingId === c.id ? (
              <div key={c.id} className="p-2.5 border rounded-md flex flex-col gap-2.5" style={{ borderColor: "var(--accent-line)" }}>
                <Input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="min-h-[34px]" />
                <IconPicker value={editIcon} onChange={setEditIcon} choices={CATEGORY_ICON_CHOICES} />
                <HuePicker value={editHue} onChange={setEditHue} isDark={isDark} />
                <div className="flex gap-2">
                  <Button size="sm" variant="solid" onClick={() => saveEdit(c.id)}>Enregistrer</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="flex items-center gap-2.5 p-2 rounded-md" style={{ background: "var(--surface2)" }}>
                <div
                  className="w-7 h-7 flex-none rounded grid place-items-center"
                  style={{ color: subjectHue(c.hue, true, isDark), background: `color-mix(in srgb, ${subjectHue(c.hue, false, isDark)} 16%, transparent)` }}
                >
                  <i className={c.icon} style={{ fontSize: 13 }} />
                </div>
                <span className="flex-1 text-[13px] truncate">{c.name}</span>
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="w-6 h-6 grid place-items-center bg-transparent border-0 disabled:opacity-25" style={{ color: "var(--muted)" }}>
                  <i className="ph ph-caret-up" style={{ fontSize: 13 }} />
                </button>
                <button type="button" disabled={i === categories.length - 1} onClick={() => move(i, 1)} className="w-6 h-6 grid place-items-center bg-transparent border-0 disabled:opacity-25" style={{ color: "var(--muted)" }}>
                  <i className="ph ph-caret-down" style={{ fontSize: 13 }} />
                </button>
                <button type="button" onClick={() => startEdit(c)} className="w-6 h-6 grid place-items-center bg-transparent border-0" style={{ color: "var(--muted)" }}>
                  <i className="ph ph-pencil-simple" style={{ fontSize: 13 }} />
                </button>
                <button type="button" onClick={() => deleteCategory(c)} className="w-6 h-6 grid place-items-center bg-transparent border-0" style={{ color: "var(--err)" }}>
                  <i className="ph ph-trash" style={{ fontSize: 13 }} />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {adding ? (
        <form onSubmit={addCategory} className="p-2.5 border rounded-md flex flex-col gap-2.5" style={{ borderColor: "var(--accent-line)" }}>
          <Input autoFocus required placeholder="L2 Chimie" value={newName} onChange={(e) => setNewName(e.target.value)} className="min-h-[34px]" />
          <IconPicker value={newIcon} onChange={setNewIcon} choices={CATEGORY_ICON_CHOICES} />
          <HuePicker value={newHue} onChange={setNewHue} isDark={isDark} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="solid" disabled={createCategory.isPending}>Créer</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuler</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" onClick={() => setAdding(true)}><i className="ph ph-plus" style={{ fontSize: 13 }} /> Nouvelle catégorie</Button>
      )}
    </div>
  );
}

function SubjectCard({ s, isDark, categories }: { s: SubjectSummary; isDark: boolean; categories: Category[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [renameValue, setRenameValue] = useState(s.name);
  const [categoryValue, setCategoryValue] = useState(s.category);
  const updateSubject = useUpdateSubject();
  const softDelete = useSoftDeleteSubject();
  const restore = useRestoreSubject();

  async function save() {
    if (renameValue.trim()) await updateSubject.mutateAsync({ id: s.id, name: renameValue.trim(), category: categoryValue });
    setEditing(false);
  }

  async function deleteSubject() {
    // Awaited before the undo toast is wired up — a fast "Annuler" click
    // can otherwise race the restore PATCH against this delete PATCH.
    await softDelete.mutateAsync(s.id);
    toast.showUndo(`« ${s.name} » déplacée dans la corbeille.`, () => restore.mutate(s.id));
  }

  return (
    <div className="p-4 border border-border rounded-lg bg-surface flex flex-col gap-[13px] animate-rise">
      <div className="flex items-start gap-[11px]">
        <div
          className="w-[34px] h-[34px] flex-none rounded-md grid place-items-center"
          style={{ color: subjectHue(s.hue, true, isDark), background: `color-mix(in srgb, ${subjectHue(s.hue, false, isDark)} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${subjectHue(s.hue, false, isDark)} 30%, transparent)` }}
        >
          <i className={s.icon} style={{ fontSize: 17 }} />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-1.5 mb-1">
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
                  className="min-h-[30px] text-sm py-1"
                />
                <button type="button" onClick={save} className="w-6 h-6 flex-none grid place-items-center bg-transparent border-0" style={{ color: "var(--accent)" }}>
                  <i className="ph ph-check" style={{ fontSize: 15 }} />
                </button>
              </div>
              {categories.length > 0 && <CategorySelect value={categoryValue} onChange={setCategoryValue} categories={categories} />}
            </div>
          ) : (
            <div className="text-[15.5px] font-medium tracking-tight">{s.name}</div>
          )}
          <div className="text-xs text-muted">{s.chaptersCount} chapitres · {s.questionsCount} questions</div>
        </div>
        <Menu
          trigger={<i className="ph ph-dots-three" style={{ fontSize: 16 }} />}
          items={[
            { label: "Modifier", onClick: () => { setEditing(true); setRenameValue(s.name); setCategoryValue(s.category); } },
            { label: "Supprimer", danger: true, onClick: deleteSubject },
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
  );
}

export function SubjectsPage() {
  const { data: subjects, isLoading } = useSubjects();
  const { data: categories } = useCategories();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [creating, setCreating] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const isDark = theme === "dark";

  const groups = useMemo(() => groupByCategory(subjects ?? [], categories ?? []), [subjects, categories]);
  const manyCategories = (categories?.length ?? 0) > 3;
  const defaultOpen = !(isMobile && manyCategories);
  // Only records an explicit user choice; anything not in here falls back
  // to `defaultOpen`, so it still reacts correctly if the category count
  // crosses the >3 threshold (or the viewport changes) later in the session.
  const [openOverrides, setOpenOverrides] = useState<Map<string, boolean>>(() => new Map());

  function isOpen(key: string): boolean {
    return openOverrides.get(key) ?? defaultOpen;
  }

  function toggle(key: string) {
    setOpenOverrides((prev) => new Map(prev).set(key, !isOpen(key)));
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
        <Button onClick={() => setManagingCategories((v) => !v)}>
          <i className="ph ph-graduation-cap" style={{ fontSize: 15 }} /> Catégories
        </Button>
        {!creating && (
          <Button variant="solid" onClick={() => setCreating(true)}>
            <i className="ph ph-plus" style={{ fontSize: 15 }} /> Nouvelle matière
          </Button>
        )}
      </div>

      {managingCategories && <CategoryManager categories={categories ?? []} onDone={() => setManagingCategories(false)} />}
      {creating && <NewSubjectForm categories={categories ?? []} onDone={() => setCreating(false)} />}

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
      ) : groups.length <= 1 && !groups[0]?.category ? (
        // No categories in play at all — plain grid, unchanged from before categories existed.
        <div className="grid gap-[11px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))" }}>
          {subjects.map((s) => <SubjectCard key={s.id} s={s} isDark={isDark} categories={categories ?? []} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const key = g.category?.id ?? "none";
            const open = isOpen(key);
            const hue = g.category ? subjectHue(g.category.hue, false, isDark) : "var(--faint)";
            const hueStrong = g.category ? subjectHue(g.category.hue, true, isDark) : "var(--muted)";
            return (
              <div key={key} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="w-full flex items-center gap-2.5 p-[12px_14px] bg-transparent border-0 text-left"
                  style={{ background: "var(--surface2)" }}
                >
                  {g.category && (
                    <div
                      className="w-7 h-7 flex-none rounded grid place-items-center"
                      style={{ color: hueStrong, background: `color-mix(in srgb, ${hue} 16%, transparent)` }}
                    >
                      <i className={g.category.icon} style={{ fontSize: 13 }} />
                    </div>
                  )}
                  <span className="flex-1 text-[13.5px] font-medium">{g.category?.name ?? "Sans catégorie"}</span>
                  <span className="text-xs tabular-nums" style={{ color: "var(--faint)" }}>{g.subjects.length}</span>
                  <i className={open ? "ph ph-caret-up" : "ph ph-caret-down"} style={{ fontSize: 13, color: "var(--faint)" }} />
                </button>
                {open && (
                  <div className="p-[12px] grid gap-[11px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))" }}>
                    {g.subjects.map((s) => <SubjectCard key={s.id} s={s} isDark={isDark} categories={categories ?? []} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
