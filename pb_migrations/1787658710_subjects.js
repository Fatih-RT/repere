/// <reference path="../pb_data/types.d.ts" />

// Ownership rule used on every app collection: a record is only visible to
// (and only writable by) the user it belongs to. Applied identically to
// list/view/create/update/delete — PocketBase resolves `user` against the
// existing record for list/view/update/delete, and against the submitted
// body for create, so the same expression is correct in all five slots.
const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

migrate((app) => {
  const collection = new Collection({
    name: "subjects",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "name", type: "text", required: true, min: 1, max: 200 },
      { name: "description", type: "text", max: 2000 },
      { name: "icon", type: "text", max: 100 },
      { name: "hue", type: "number", required: true, min: 0, max: 360 },
      { name: "position", type: "number" },
      // Soft delete: set on trash, cleared on restore. Hard-deleted (and
      // cascaded to chapters/questions) only by the 30-day purge job.
      { name: "deleted_at", type: "date" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX `idx_subjects_user` ON `subjects` (`user`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    updateRule: OWNER_RULE,
    deleteRule: OWNER_RULE,
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("subjects"));
});
