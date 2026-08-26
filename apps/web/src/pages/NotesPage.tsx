import { useMemo, useState } from "react";
import { useLibrary } from "@/lib/subjects";
import { useCategories } from "@/lib/categories";
import { useTheme } from "@/theme/ThemeProvider";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { subjectHue } from "@/lib/visual";

const ALL_CATEGORIES = "__all";

// The notes feature itself doesn't exist yet — this page only wires up the
// real matière/chapitre picker (categories included) so the "bientôt
// disponible" placeholder below sits in the right context instead of
// floating on its own. Swap the placeholder card for real note content
// once that's built; the picker stays as-is.
export function NotesPage() {
  const { data: library, isLoading } = useLibrary();
  const { data: categories } = useCategories();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ subjectId: string; subjectName: string; chapterId: string | null; chapterName: string | null } | null>(null);

  const filtered = useMemo(
    () => (categoryFilter === ALL_CATEGORIES ? library : library?.filter((s) => s.category === categoryFilter)),
    [library, categoryFilter]
  );

  return (
    <div className="animate-fade">
      <div className="flex items-end gap-3.5 flex-wrap mb-5">
        <div className="flex-1 min-w-[200px]">
          <h1 className="m-0 mb-1 text-2xl font-medium tracking-tight">Notes</h1>
          <p className="m-0 text-[13.5px] text-muted" style={{ textWrap: "pretty" }}>
            Choisis une matière ou un chapitre — la prise de notes arrive bientôt.
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
          description="Crée une matière et quelques chapitres, ils apparaîtront ici dès que la prise de notes sera disponible."
        />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-[9px] lg:w-[340px] lg:flex-none">
            {filtered.map((s) => {
              const open = openSubject === s.id;
              const hueStrong = subjectHue(s.hue, true, isDark);
              const hue = subjectHue(s.hue, false, isDark);
              return (
                <div key={s.id} className="rounded-xl overflow-hidden bg-surface" style={{ border: `1px solid ${open ? "var(--accent-line)" : "var(--border)"}` }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenSubject(open ? null : s.id);
                      setSelected({ subjectId: s.id, subjectName: s.name, chapterId: null, chapterName: null });
                    }}
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
                          onClick={() => setSelected({ subjectId: s.id, subjectName: s.name, chapterId: c.id, chapterName: c.name })}
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
              <div className="p-6 rounded-xl bg-surface flex flex-col items-center text-center gap-2.5" style={{ border: "1px dashed var(--border2)" }}>
                <i className="ph ph-hourglass-medium" style={{ fontSize: 26, color: "var(--faint)" }} />
                <div className="text-[14.5px] font-medium">
                  Notes — {selected.chapterName ?? selected.subjectName}
                </div>
                <p className="m-0 text-[12.5px]" style={{ color: "var(--faint)", textWrap: "pretty" }}>
                  Cette fonctionnalité est en cours de développement. On la fera plus tard — pour l'instant, retrouve tes questions dans {selected.chapterName ? "ce chapitre" : "cette matière"} via l'onglet Matières.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
