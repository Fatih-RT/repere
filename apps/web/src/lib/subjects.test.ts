import { describe, expect, it } from "vitest";
import { buildChapterCascadePlan, buildSubjectCascadePlan } from "./subjects";

describe("buildSubjectCascadePlan", () => {
  it("includes the subject itself plus every chapter, question and note, all with the same deleted_at", () => {
    const plan = buildSubjectCascadePlan(
      "subj1",
      [{ id: "chap1" }, { id: "chap2" }],
      [{ id: "q1" }, { id: "q2" }, { id: "q3" }],
      [{ id: "n1" }],
      "2026-01-01T00:00:00.000Z"
    );
    expect(plan).toHaveLength(1 + 2 + 3 + 1);
    expect(plan.every((op) => op.deleted_at === "2026-01-01T00:00:00.000Z")).toBe(true);
    expect(plan.find((op) => op.collection === "subjects")?.id).toBe("subj1");
    expect(plan.filter((op) => op.collection === "chapters").map((op) => op.id)).toEqual(["chap1", "chap2"]);
    expect(plan.filter((op) => op.collection === "questions").map((op) => op.id)).toEqual(["q1", "q2", "q3"]);
    expect(plan.filter((op) => op.collection === "notes").map((op) => op.id)).toEqual(["n1"]);
  });

  it("restoring clears deleted_at to an empty string", () => {
    const plan = buildSubjectCascadePlan("subj1", [{ id: "chap1" }], [], [], "");
    expect(plan.every((op) => op.deleted_at === "")).toBe(true);
  });

  it("still cascades the subject alone when it has no chapters, questions or notes", () => {
    const plan = buildSubjectCascadePlan("subj1", [], [], [], "now");
    expect(plan).toEqual([{ collection: "subjects", id: "subj1", deleted_at: "now" }]);
  });
});

describe("buildChapterCascadePlan", () => {
  it("includes the chapter itself plus every question and note, all with the same deleted_at", () => {
    const plan = buildChapterCascadePlan("chap1", [{ id: "q1" }, { id: "q2" }], [{ id: "n1" }], "2026-01-01T00:00:00.000Z");
    expect(plan).toEqual([
      { collection: "chapters", id: "chap1", deleted_at: "2026-01-01T00:00:00.000Z" },
      { collection: "questions", id: "q1", deleted_at: "2026-01-01T00:00:00.000Z" },
      { collection: "questions", id: "q2", deleted_at: "2026-01-01T00:00:00.000Z" },
      { collection: "notes", id: "n1", deleted_at: "2026-01-01T00:00:00.000Z" },
    ]);
  });
});
