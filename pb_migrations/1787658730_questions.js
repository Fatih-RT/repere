/// <reference path="../pb_data/types.d.ts" />

const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

migrate((app) => {
  const subjects = app.findCollectionByNameOrId("subjects");
  const chapters = app.findCollectionByNameOrId("chapters");

  const collection = new Collection({
    name: "questions",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "chapter", type: "relation", required: true, collectionId: chapters.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      // Denormalized so the review queue can filter by subject without a
      // chapter join.
      { name: "subject", type: "relation", required: true, collectionId: subjects.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "question", type: "text", required: true, min: 1, max: 8000 },
      { name: "answer", type: "text", required: true, min: 1, max: 8000 },
      // mhchem covers formulas/equations; organic mechanisms and topological
      // structures don't exist as text, hence the image fields.
      { name: "question_images", type: "file", maxSelect: 6, maxSize: 6291456, mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
      { name: "answer_images", type: "file", maxSelect: 6, maxSize: 6291456, mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
      { name: "suspended", type: "bool" },
      { name: "deleted_at", type: "date" },
      // Scheduler state (see src/lib/scheduler/ — this table is written by
      // the client after every review, see that module's header comment for
      // why).
      { name: "state", type: "select", required: true, maxSelect: 1, values: ["new", "learning", "review"] },
      { name: "due_at", type: "date", required: true },
      // Not `required: true`: PocketBase treats a number field's zero value
      // as "unset" for required validation, but 0 is exactly what a brand
      // new card legitimately starts at for all three of these fields.
      { name: "interval_days", type: "number", min: 0 },
      { name: "ease_factor", type: "number", required: true, min: 1.3, max: 2.8 },
      { name: "repetitions", type: "number", min: 0 },
      { name: "lapses", type: "number", min: 0 },
      { name: "last_reviewed_at", type: "date" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX `idx_questions_user` ON `questions` (`user`)",
      "CREATE INDEX `idx_questions_chapter` ON `questions` (`chapter`)",
      "CREATE INDEX `idx_questions_subject` ON `questions` (`subject`)",
      "CREATE INDEX `idx_questions_due_at` ON `questions` (`due_at`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    updateRule: OWNER_RULE,
    deleteRule: OWNER_RULE,
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("questions"));
});
