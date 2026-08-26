/// <reference path="../pb_data/types.d.ts" />

const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

// A grouping level above subjects (e.g. "L2 Chimie", "BTS SIO", "Concours")
// — each of the app's two users studies more than one track at once, and
// subjects alone don't separate them. Optional on purpose: existing
// subjects, and new ones, work fine with no category at all.
migrate((app) => {
  const categories = new Collection({
    name: "categories",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "name", type: "text", required: true, min: 1, max: 100 },
      { name: "hue", type: "number", required: true, min: 0, max: 360 },
      { name: "icon", type: "text", max: 100 },
      { name: "position", type: "number" },
      // Soft delete, same convention as subjects/chapters/questions — see
      // that comment there for why this is a date, not a bool.
      { name: "deleted_at", type: "date" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX `idx_categories_user` ON `categories` (`user`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    updateRule: OWNER_RULE,
    deleteRule: OWNER_RULE,
  });
  app.save(categories);

  const subjects = app.findCollectionByNameOrId("subjects");
  subjects.fields.add(new Field({
    name: "category",
    type: "relation",
    required: false,
    collectionId: categories.id,
    // Not cascaded: deleting a category must never take its subjects with
    // it — they fall back to "no category", exactly like a subject that
    // never had one. Only the trash's own soft-delete/restore/30-day purge
    // ever removes a subject.
    cascadeDelete: false,
    maxSelect: 1,
  }));
  app.save(subjects);
}, (app) => {
  const subjects = app.findCollectionByNameOrId("subjects");
  subjects.fields.removeByName("category");
  app.save(subjects);

  app.delete(app.findCollectionByNameOrId("categories"));
});
