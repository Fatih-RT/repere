/// <reference path="../pb_data/types.d.ts" />

const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

migrate((app) => {
  const subjects = app.findCollectionByNameOrId("subjects");
  const chapters = app.findCollectionByNameOrId("chapters");

  const collection = new Collection({
    name: "pomodoro_sessions",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "subject", type: "relation", collectionId: subjects.id, cascadeDelete: false, maxSelect: 1 },
      { name: "chapter", type: "relation", collectionId: chapters.id, cascadeDelete: false, maxSelect: 1 },
      { name: "phase", type: "select", required: true, maxSelect: 1, values: ["focus", "short_break", "long_break"] },
      { name: "planned_seconds", type: "number", required: true, min: 0 },
      { name: "actual_seconds", type: "number", required: true, min: 0 },
      { name: "started_at", type: "date", required: true },
      { name: "ended_at", type: "date" },
      { name: "completed", type: "bool" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX `idx_pomodoro_sessions_user_started` ON `pomodoro_sessions` (`user`, `started_at`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    updateRule: OWNER_RULE,
    deleteRule: OWNER_RULE,
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("pomodoro_sessions"));
});
