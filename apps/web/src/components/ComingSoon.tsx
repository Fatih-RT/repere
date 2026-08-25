// Placeholder for screens not yet migrated to the PocketBase SDK — swapped
// back for the real page as each step of the migration lands. Keeps the app
// buildable and navigable at every intermediate step instead of leaving
// broken imports lying around.
export function ComingSoon({ title, step }: { title: string; step: number }) {
  return (
    <div className="animate-fade grid place-items-center py-20 text-center">
      <div
        className="w-11 h-11 rounded-md grid place-items-center mb-3.5"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        <i className="ph ph-hourglass-medium" style={{ fontSize: 22 }} />
      </div>
      <h1 className="m-0 mb-1.5 text-xl font-medium">{title}</h1>
      <p className="m-0 text-sm text-muted">Migration PocketBase en cours — étape {step}.</p>
    </div>
  );
}
