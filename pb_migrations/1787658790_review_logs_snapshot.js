/// <reference path="../pb_data/types.d.ts" />

// Fixes a real bug: `question` (and `session`) were `required: true` with
// `cascadeDelete: false`. Deleting the referenced question left PocketBase
// trying to clear a required relation, which fails validation — so any
// question that had ever been reviewed could never be hard-deleted, and
// the trash purge cron used to fail on it every time.
//
// Fix: both relations become optional, and a text snapshot of the question
// (question_text/answer_text) is taken at write time so the log stays
// readable forever, even after the question itself is gone — see
// apps/web/src/lib/review.ts, which now fills these two fields on create.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("review_logs");
  const questions = app.findCollectionByNameOrId("questions");
  const sessions = app.findCollectionByNameOrId("review_sessions");

  collection.fields.add(
    new Field({ name: "question", type: "relation", required: false, collectionId: questions.id, cascadeDelete: false, maxSelect: 1 }),
    new Field({ name: "session", type: "relation", required: false, collectionId: sessions.id, cascadeDelete: false, maxSelect: 1 }),
    new Field({ name: "question_text", type: "text", required: true, max: 8000 }),
    new Field({ name: "answer_text", type: "text", required: true, max: 8000 })
  );
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("review_logs");
  const questions = app.findCollectionByNameOrId("questions");
  const sessions = app.findCollectionByNameOrId("review_sessions");

  collection.fields.add(
    new Field({ name: "question", type: "relation", required: true, collectionId: questions.id, cascadeDelete: false, minSelect: 1, maxSelect: 1 }),
    new Field({ name: "session", type: "relation", required: true, collectionId: sessions.id, cascadeDelete: false, minSelect: 1, maxSelect: 1 })
  );
  collection.fields.removeByName("question_text");
  collection.fields.removeByName("answer_text");
  app.save(collection);
});
