/// <reference path="../pb_data/types.d.ts" />

const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

// Free-form course content ("cours"), separate from the question/answer
// flashcards: one matière can have several notes, each optionally scoped
// to one of its chapters. `content` uses the same $...$ / $$...$$ math
// syntax as questions (see MathText.tsx) so formulas and \ce{} chemistry
// notation work here too.
migrate((app) => {
  const subjects = app.findCollectionByNameOrId("subjects");
  const chapters = app.findCollectionByNameOrId("chapters");

  const notes = new Collection({
    name: "notes",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "subject", type: "relation", required: true, collectionId: subjects.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      // Optional: a note can cover a whole matière (no chapter) or one
      // chapter specifically. Not cascaded — same reasoning as
      // subjects.category — so deleting a chapter doesn't silently take
      // notes with it via PocketBase's own cascade; the app-level
      // chapter cascade (buildChapterCascadePlan) decides that instead.
      { name: "chapter", type: "relation", required: false, collectionId: chapters.id, cascadeDelete: false, maxSelect: 1 },
      { name: "title", type: "text", required: true, min: 1, max: 200 },
      { name: "content", type: "text", required: true, min: 1, max: 20000 },
      { name: "position", type: "number" },
      // Soft delete, same convention as subjects/chapters/questions.
      { name: "deleted_at", type: "date" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX `idx_notes_user` ON `notes` (`user`)",
      "CREATE INDEX `idx_notes_subject` ON `notes` (`subject`)",
      "CREATE INDEX `idx_notes_chapter` ON `notes` (`chapter`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    updateRule: OWNER_RULE,
    deleteRule: OWNER_RULE,
  });
  app.save(notes);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("notes"));
});
