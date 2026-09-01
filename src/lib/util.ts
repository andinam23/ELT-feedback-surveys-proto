// Small, dependency-free helpers safe to import from both client and server code.

/** Best-effort term label guess from a filename like "03rd_February_2026.xlsx". */
export function guessTermLabel(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[_-]+/g, " ").trim();
  return cleaned || base;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
