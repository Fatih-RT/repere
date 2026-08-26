import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "./pb";
import { fetchActive } from "./subjects";
import type { Category } from "./types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchActive<Category>("categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; hue?: number; icon?: string }) =>
      pb.collection("categories").create<Category>({
        user: pb.authStore.record!.id,
        icon: "ph ph-graduation-cap",
        hue: 230,
        position: Date.now(),
        ...data,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; hue?: number; icon?: string; position?: number }) =>
      pb.collection("categories").update<Category>(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// Swaps two categories' `position` so a "move up"/"move down" control can
// reorder the list — no drag-and-drop library for what's a short, rarely
// reordered list of study tracks.
export function useSwapCategoryPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ a, b }: { a: Category; b: Category }) => {
      await Promise.all([
        pb.collection("categories").update(a.id, { position: b.position }),
        pb.collection("categories").update(b.id, { position: a.position }),
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// Soft delete only — never cascades to subjects. A category is purely an
// organizational grouping; deleting one must never take its subjects with
// it (see pb_migrations/1787658800_categories.js, `category` is not a
// cascadeDelete relation on subjects for exactly this reason). Subjects
// referencing a trashed category simply render under "Sans catégorie"
// until it's restored — see `groupByCategory` below.
export function useSoftDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pb.collection("categories").update<Category>(id, { deleted_at: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

export function useRestoreCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pb.collection("categories").update<Category>(id, { deleted_at: "" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

export interface CategoryGroup<S extends { category: string }> {
  category: Category | null; // null = "Sans catégorie"
  subjects: S[];
}

// Pure grouping logic (no network, no React) so it's unit-testable on its
// own — see categories.test.ts. A subject's `category` only counts if it
// resolves to a category in `activeCategories`: a trashed or purged
// category id on a subject is treated exactly like no category at all,
// which is what lets a category disappear (soft-delete or the 30-day
// purge) without ever orphaning or hiding a subject.
export function groupByCategory<S extends { category: string }>(subjects: S[], activeCategories: Category[]): CategoryGroup<S>[] {
  // Sorted here rather than trusted from the caller — useCategories()
  // already sorts by position, but a self-contained guarantee is worth
  // more than an implicit one two call sites away.
  const sortedCategories = activeCategories.slice().sort((a, b) => a.position - b.position);
  const byId = new Map(sortedCategories.map((c) => [c.id, c]));
  const groups = new Map<string, S[]>();
  const uncategorized: S[] = [];

  for (const s of subjects) {
    const cat = byId.get(s.category);
    if (!cat) {
      uncategorized.push(s);
      continue;
    }
    const list = groups.get(cat.id) ?? [];
    list.push(s);
    groups.set(cat.id, list);
  }

  // Empty categories (no subjects yet) are left out of this display
  // grouping — same "no empty block" rule as "Sans catégorie" below. They
  // still show up in category management, which reads useCategories()
  // directly rather than through this function.
  const ordered: CategoryGroup<S>[] = sortedCategories
    .filter((c) => groups.has(c.id))
    .map((c) => ({ category: c, subjects: groups.get(c.id)! }));

  if (uncategorized.length) ordered.push({ category: null, subjects: uncategorized });
  return ordered;
}
