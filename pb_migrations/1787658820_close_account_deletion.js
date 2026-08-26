/// <reference path="../pb_data/types.d.ts" />

// Without this, PocketBase's default `users` deleteRule
// (`id = @request.auth.id`) lets a logged-in user delete their own
// account — no confirmation beyond the UI, no undo, no trash. Locking
// deleteRule to null (superuser-only) makes that impossible from the app
// itself, not just hidden from it — same reasoning as
// close_registration.js locking createRule.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.deleteRule = null;
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.deleteRule = "id = @request.auth.id"; // PocketBase's own default for a fresh auth collection
  app.save(users);
});
