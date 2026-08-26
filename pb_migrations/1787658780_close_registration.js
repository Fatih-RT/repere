/// <reference path="../pb_data/types.d.ts" />

// This app has exactly two users, created by hand from the Admin UI.
// Without this, PocketBase's default `users` createRule (`""`, i.e. public)
// lets anyone who finds the URL sign themselves up. Locking createRule to
// `null` restricts creation to superusers only — the same convention
// review_logs already uses for its append-only updateRule/deleteRule.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.createRule = null;
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.createRule = ""; // PocketBase's own default for a fresh auth collection
  app.save(users);
});
