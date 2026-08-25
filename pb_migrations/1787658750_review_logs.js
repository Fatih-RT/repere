/// <reference path="../pb_data/types.d.ts" />

const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

migrate((app) => {
  const questions = app.findCollectionByNameOrId("questions");
  const sessions = app.findCollectionByNameOrId("review_sessions");

  const collection = new Collection({
    name: "review_logs",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: 1, maxSelect: 1 },
      // No cascadeDelete on question/session: the review history must
      // survive the question (or its chapter/subject) being purged from
      // the trash — that's the whole point of an append-only log.
      { name: "question", type: "relation", required: true, collectionId: questions.id, cascadeDelete: false, minSelect: 1, maxSelect: 1 },
      { name: "session", type: "relation", required: true, collectionId: sessions.id, cascadeDelete: false, minSelect: 1, maxSelect: 1 },
      { name: "rating", type: "select", required: true, maxSelect: 1, values: ["again", "hard", "good"] },
      { name: "state_before", type: "select", required: true, maxSelect: 1, values: ["new", "learning", "review"] },
      // Not required: a brand new card's interval_before is legitimately
      // 0, and an instant answer's duration_ms can legitimately be 0 —
      // PocketBase's required validation on numbers rejects the zero value.
      { name: "interval_before", type: "number", min: 0 },
      { name: "interval_after", type: "number", required: true },
      { name: "ease_before", type: "number", required: true },
      { name: "ease_after", type: "number", required: true },
      { name: "duration_ms", type: "number", min: 0 },
      { name: "reviewed_at", type: "date", required: true },
      { name: "scheduler_version", type: "text", required: true, max: 50 },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: [
      "CREATE INDEX `idx_review_logs_user_reviewed` ON `review_logs` (`user`, `reviewed_at`)",
      "CREATE INDEX `idx_review_logs_session` ON `review_logs` (`session`)",
      "CREATE INDEX `idx_review_logs_question` ON `review_logs` (`question`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    // Append-only: `null` (not `""`) locks these to superusers only — an
    // empty-string rule would mean "public", the opposite of what we want.
    updateRule: null,
    deleteRule: null,
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("review_logs"));
});
