/// <reference path="../pb_data/types.d.ts" />

const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

migrate((app) => {
  const subjects = app.findCollectionByNameOrId("subjects");

  const collection = new Collection({
    name: "chapters",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "subject", type: "relation", required: true, collectionId: subjects.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "name", type: "text", required: true, min: 1, max: 200 },
      { name: "position", type: "number" },
      { name: "deleted_at", type: "date" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX `idx_chapters_user` ON `chapters` (`user`)",
      "CREATE INDEX `idx_chapters_subject` ON `chapters` (`subject`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    updateRule: OWNER_RULE,
    deleteRule: OWNER_RULE,
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("chapters"));
});
