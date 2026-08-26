/// <reference path="../pb_data/types.d.ts" />

// Permanently removes anything that has sat in the trash (deleted_at set)
// for more than 30 days — the server-side half of the soft-delete/undo
// flow in apps/web/src/lib/{categories,subjects,questions,trash}.ts. Runs daily.
//
// Subjects and chapters are purged first: their `cascadeDelete: true`
// relations (see pb_migrations) then hard-delete any children too, which
// covers a child that was trashed alongside its parent. Deleting each
// collection separately (rather than relying purely on cascade) also
// catches a question or chapter that was trashed on its own, independently
// of its still-active parent.
//
// Categories are the one exception: `subjects.category` is deliberately
// not a cascadeDelete relation, so purging a stale category never touches
// its subjects — they just fall back to "no category", same as if the
// category had never existed.
cronAdd("purge_trash", "0 3 * * *", () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const params = { cutoff };

  for (const name of ["categories", "subjects", "chapters", "questions"]) {
    const stale = $app.findRecordsByFilter(name, "deleted_at != '' && deleted_at < {:cutoff}", "", 0, 0, params);
    for (const record of stale) {
      $app.delete(record);
    }
  }
});
