import { describe, expect, it } from "vitest";
import { groupByCategory } from "./categories";
import type { Category } from "./types";

function cat(id: string, position: number): Category {
  return { id, user: "u1", name: id, hue: 0, icon: "", position, deleted_at: "", created: "", updated: "" };
}
function subj(id: string, category: string) {
  return { id, category };
}

describe("groupByCategory", () => {
  it("groups subjects under their category, ordered by category position", () => {
    const categories = [cat("b", 2), cat("a", 1)];
    const subjects = [subj("s1", "a"), subj("s2", "b"), subj("s3", "a")];
    const groups = groupByCategory(subjects, categories);
    expect(groups.map((g) => g.category?.id)).toEqual(["a", "b"]);
    expect(groups[0].subjects.map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(groups[1].subjects.map((s) => s.id)).toEqual(["s2"]);
  });

  it("puts subjects with no category into a trailing null group", () => {
    const categories = [cat("a", 1)];
    const subjects = [subj("s1", "a"), subj("s2", "")];
    const groups = groupByCategory(subjects, categories);
    expect(groups.map((g) => g.category)).toEqual([categories[0], null]);
    expect(groups[1].subjects.map((s) => s.id)).toEqual(["s2"]);
  });

  it("treats a category id that isn't in the active list as uncategorized", () => {
    // Simulates a soft-deleted or purged category still referenced by a
    // subject's stale `category` field — must not orphan or hide the subject.
    const subjects = [subj("s1", "deleted-category-id")];
    const groups = groupByCategory(subjects, []);
    expect(groups).toEqual([{ category: null, subjects: [subjects[0]] }]);
  });

  it("omits categories with no subjects, and omits the null group when everything is categorized", () => {
    const categories = [cat("a", 1), cat("empty", 2)];
    const subjects = [subj("s1", "a")];
    const groups = groupByCategory(subjects, categories);
    expect(groups).toHaveLength(1);
    expect(groups[0].category?.id).toBe("a");
  });

  it("returns an empty array for no subjects at all", () => {
    expect(groupByCategory([], [cat("a", 1)])).toEqual([]);
  });
});
