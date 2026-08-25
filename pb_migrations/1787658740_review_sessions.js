/// <reference path="../pb_data/types.d.ts" />

const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

migrate((app) => {
  const subjects = app.findCollectionByNameOrId("subjects");
  const chapters = app.findCollectionByNameOrId("chapters");

  const collection = new Collection({
    name: "review_sessions",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      // "due": the day's scheduled queue. "selection": chapters picked
      // explicitly from the révisions hub.
      { name: "mode", type: "select", required: true, maxSelect: 1, values: ["due", "selection"] },
      { name: "subject", type: "relation", collectionId: subjects.id, cascadeDelete: false, maxSelect: 1 },
      { name: "chapter", type: "relation", collectionId: chapters.id, cascadeDelete: false, maxSelect: 1 },
      { name: "started_at", type: "date", required: true },
      { name: "ended_at", type: "date" },
      // Not required: PocketBase treats a number field's zero value as
      // "unset" for required validation, but a session legitimately starts
      // at 0 seen/correct.
      { name: "cards_seen", type: "number", min: 0 },
      { name: "cards_correct", type: "number", min: 0 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX `idx_review_sessions_user` ON `review_sessions` (`user`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    updateRule: OWNER_RULE,
    deleteRule: OWNER_RULE,
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("review_sessions"));
});
