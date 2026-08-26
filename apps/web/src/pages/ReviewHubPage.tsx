import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLibrary } from "@/lib/subjects";
import { useCategories } from "@/lib/categories";
import { useReviewQueue } from "@/lib/review";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { DueTag } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { subjectHue } from "@/lib/visual";

const ALL_CATEGORIES = "__all";

export function ReviewHubPage() {
  const { data: fullLibrary, isLoading } = useLibrary();
  const { data: categories } = useCategories();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  // Keys are "subjectId§chapterId" — mirrors the design mock's selection model.
  const [sel, setSel] = useState<Record<string, boolean>>({});

  // Narrows which chapters are offered for selection to one cursus — it
  // does not change what "today's due session" (no selection) pulls in,
  // which stays account-wide by design.
  const library = useMemo(
    () => (categoryFilter === ALL_CATEGORIES ? fullLibrary : fullLibrary?.filter((s) => s.category === categoryFilter)),
    [fullLibrary, categoryFilter]
  );

  const selectedChapterIds = useMemo(
    () => Object.keys(sel).filter((k) => sel[k]).map((k) => k.split("§")[1]),
    [sel]
  );
  const hasSel = selectedChapterIds.length > 0;

  const { data: dueQueue } = useReviewQueue({});
  const { data: selectionQueue } = useReviewQueue({ chapterIds: hasSel ? selectedChapterIds : undefined });

  const sessionCount = hasSel ? selectionQueue?.length ?? 0 : dueQueue?.length ?? 0;

  function toggleChapter(subjectId: string, chapterId: string) {
    const key = `${subjectId}§${chapterId}`;
    setSel((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }

  function toggleAll(subjectId: string, chapterIds: string[]) {
    const keys = chapterIds.map((id) => `${subjectId}§${id}`);
    const allSelected = keys.length > 0 && keys.every((k) => sel[k]);
    setSel((prev) => {
      const next = { ...prev };
      for (const k of keys) {
        if (allSelected) delete next[k];
        else next[k] = true;
      }
      return next;
    });
  }

  function startReview() {
    if (hasSel) {
      navigate("/review/session", { state: { mode: "selection", chapterIds: selectedChapterIds } });
    } else {
      navigate("/review/session", { state: { mode: "due" } });
    }
  }

  return (
    <div className="animate-fade">
      <div className="flex items-end gap-3.5 flex-wrap mb-5">
        <div className="flex-1 min-w-[200px]">
          <h1 className="m-0 mb-1 text-2xl font-medium tracking-tight">Révisions</h1>
          <p className="m-0 text-[13.5px] text-muted" style={{ textWrap: "pretty" }}>
            Choisis les chapitres à revoir, ou lance directement la session du jour.
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
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : !library?.length ? (
        <EmptyState
          icon="ph ph-cards-three"
          title="Rien à réviser pour l'instant"
          description="Crée une matière et quelques questions, et elles apparaîtront ici dès qu'elles seront prêtes."
          action={<Button variant="solid" onClick={() => navigate("/create")}><i className="ph ph-plus" style={{ fontSize: 15 }} /> Ajouter une question</Button>}
        />
      ) : (
        <div>
          <div
            className="flex items-center gap-2.5 flex-wrap p-3.5 rounded-xl mb-3"
            style={{ border: "1px solid var(--accent-line)", background: "var(--surface)" }}
          >
            <div className="flex-1 min-w-[150px]">
              <div className="text-[13.5px] font-medium">{sessionCount} question{sessionCount > 1 ? "s" : ""} dans la session</div>
              <div className="text-[11.5px]" style={{ color: "var(--faint)", textWrap: "pretty" }}>
                {hasSel
                  ? "Repère mélangera ces chapitres et commencera par les notions les plus fragiles."
                  : "Sans sélection, la session du jour reprend les questions que Repère a programmées."}
              </div>
            </div>
            {hasSel && (
              <Button size="sm" onClick={() => setSel({})}>Vider ({selectedChapterIds.length})</Button>
            )}
            <Button variant="solid" onClick={startReview} disabled={sessionCount === 0}>
              <i className="ph ph-play" style={{ fontSize: 14 }} /> Commencer
            </Button>
          </div>

          <div className="flex flex-col gap-[9px]">
            {library.map((s) => {
              const open = openSubject === s.id;
              const chapterIds = s.chaptersList.map((c) => c.id);
              const allSelected = chapterIds.length > 0 && chapterIds.every((id) => sel[`${s.id}§${id}`]);
              const hueStrong = subjectHue(s.hue, true, isDark);
              const hue = subjectHue(s.hue, false, isDark);
              return (
                <div key={s.id} className="rounded-xl overflow-hidden bg-surface" style={{ border: `1px solid ${open ? "var(--accent-line)" : "var(--border)"}` }}>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setOpenSubject(open ? null : s.id)}
                      className="flex-1 min-w-0 flex items-center gap-[11px] p-[13px_14px] bg-transparent border-0 text-left"
                    >
                      <div
                        className="w-8 h-8 flex-none rounded-md grid place-items-center"
                        style={{ color: hueStrong, background: `color-mix(in srgb, ${hue} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${hue} 30%, transparent)` }}
                      >
                        <i className={s.icon} style={{ fontSize: 16 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-medium tracking-tight truncate">{s.name}</div>
                        <div className="text-[11.5px] text-muted truncate">
                          {s.chaptersCount} chapitre{s.chaptersCount > 1 ? "s" : ""} · {s.questionsCount} question{s.questionsCount > 1 ? "s" : ""} · {s.due} à revoir
                        </div>
                      </div>
                      <i className={open ? "ph ph-caret-up" : "ph ph-caret-down"} style={{ fontSize: 14, color: "var(--faint)" }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAll(s.id, chapterIds)}
                      className="flex-none mr-3 px-2.5 py-[5px] rounded-md text-[11.5px] whitespace-nowrap"
                      style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      {allSelected ? "Aucun" : "Tout"}
                    </button>
                  </div>
                  {open && (
                    <div>
                      {s.chaptersList.map((c) => {
                        const key = `${s.id}§${c.id}`;
                        const on = !!sel[key];
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleChapter(s.id, c.id)}
                            className="w-full flex items-center gap-2.5 p-[11px_14px] text-left border-0"
                            style={{ borderTop: "1px solid var(--border)", background: on ? "var(--accent-soft)" : "transparent", color: "var(--text)" }}
                          >
                            <span
                              className="w-[18px] h-[18px] flex-none grid place-items-center rounded-[5px]"
                              style={{ border: `1px solid ${on ? "var(--accent)" : "var(--border2)"}`, background: on ? "var(--accent-soft2)" : "transparent", color: "var(--accent)" }}
                            >
                              {on && <i className="ph-fill ph-check" style={{ fontSize: 11 }} />}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[13.5px] truncate">{c.name}</span>
                              <span className="block text-[11.5px] truncate" style={{ color: "var(--faint)" }}>{c.questionsCount} questions</span>
                            </span>
                            <DueTag due={c.due} />
                            <span className="flex-none text-xs tabular-nums whitespace-nowrap" style={{ color: "var(--faint)" }}>{c.mastery}%</span>
                          </button>
                        );
                      })}
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
        </div>
      )}
    </div>
  );
}
