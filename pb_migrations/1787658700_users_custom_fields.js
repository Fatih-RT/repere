/// <reference path="../pb_data/types.d.ts" />

// Adds the one field the app needs on top of PocketBase's built-in `users`
// auth collection (email/password/name/avatar already exist by default).
// `class_name` mirrors the "Terminale S" line shown under the user's name
// in the sidebar.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new Field({
    name: "class_name",
    type: "text",
    required: false,
    max: 100,
  }));
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("class_name");
  app.save(users);
});
