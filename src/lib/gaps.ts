export type Range = { inicio: number; fim: number };

/** Complementary gaps of [start, end] not covered by the given (assumed non-overlapping) intervals. */
export function computeGaps(
  start: number,
  end: number,
  covered: Range[],
): Range[] {
  const sorted = [...covered].sort((a, b) => a.inicio - b.inicio);
  const gaps: Range[] = [];
  let cursor = start;

  for (const { inicio, fim } of sorted) {
    if (inicio > cursor) {
      gaps.push({ inicio: cursor, fim: Math.min(inicio - 1, end) });
    }
    cursor = Math.max(cursor, fim + 1);
    if (cursor > end) break;
  }

  if (cursor <= end) {
    gaps.push({ inicio: cursor, fim: end });
  }

  return gaps.filter((g) => g.inicio <= g.fim);
}
