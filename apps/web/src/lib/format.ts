export function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function relativeFr(dateStr: string | null, now: Date = new Date()): string {
  if (!dateStr) return "Jamais révisé";
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffHours <= 0) return "Révisé à l'instant";
    if (diffHours === 1) return "Révisé il y a 1 heure";
    return `Révisé il y a ${diffHours} heures`;
  }
  if (diffDays === 1) return "Révisé hier";
  return `Révisé il y a ${diffDays} jours`;
}
