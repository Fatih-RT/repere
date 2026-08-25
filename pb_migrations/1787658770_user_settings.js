/// <reference path="../pb_data/types.d.ts" />

const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

migrate((app) => {
  const collection = new Collection({
    name: "user_settings",
    type: "base",
    fields: [
      // Unique index below enforces "one record per user" — the app
      // upserts on first access rather than relying on a fixed record id.
      { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { name: "theme", type: "select", required: true, maxSelect: 1, values: ["light", "dark", "rose"] },
      { name: "follow_system", type: "bool" },
      { name: "timezone", type: "text", required: true, max: 100 },
      { name: "day_cutoff_hour", type: "number", required: true, min: 0, max: 23 },
      { name: "daily_new_limit", type: "number", required: true, min: 0 },
      { name: "daily_review_limit", type: "number", required: true, min: 0 },
      { name: "pomo_work", type: "number", required: true, min: 1 },
      { name: "pomo_short", type: "number", required: true, min: 1 },
      { name: "pomo_long", type: "number", required: true, min: 1 },
      { name: "pomo_sessions", type: "number", required: true, min: 1 },
      { name: "daily_goal_mins", type: "number", required: true, min: 1 },
      { name: "mix_subjects", type: "bool" },
      { name: "notif", type: "bool" },
      { name: "sons", type: "bool" },
      { name: "anim", type: "bool" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_user_settings_user` ON `user_settings` (`user`)",
    ],
    listRule: OWNER_RULE,
    viewRule: OWNER_RULE,
    createRule: OWNER_RULE,
    updateRule: OWNER_RULE,
    deleteRule: OWNER_RULE,
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("user_settings"));
});
