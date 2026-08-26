/// <reference path="../pb_data/types.d.ts" />

// Permanently removes anything that has sat in the trash (deleted_at set)
// for more than 30 days — the server-side half of the soft-delete/undo
// flow in apps/web/src/lib/{categories,subjects,questions,notes,trash}.ts.
// Runs daily.
//
// Subjects and chapters are purged first: their `cascadeDelete: true`
// relations (see pb_migrations) then hard-delete any children too, which
// covers a child that was trashed alongside its parent. Deleting each
// collection separately (rather than relying purely on cascade) also
// catches a question, note or chapter that was trashed on its own,
// independently of its still-active parent.
//
// Categories are the one exception: `subjects.category` is deliberately
// not a cascadeDelete relation, so purging a stale category never touches
// its subjects — they just fall back to "no category", same as if the
// category had never existed. `notes.chapter` is the same kind of
// exception one level down: purging a stale chapter never takes a note
// with it purely via that relation — the note's own deleted_at (set by the
// app-level chapter cascade, if it was ever set) is what decides.
cronAdd("purge_trash", "0 3 * * *", () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const params = { cutoff };

  for (const name of ["categories", "subjects", "chapters", "questions", "notes"]) {
    const stale = $app.findRecordsByFilter(name, "deleted_at != '' && deleted_at < {:cutoff}", "", 0, 0, params);
    for (const record of stale) {
      $app.delete(record);
    }
  }
});
