/**
 * Flattens the inventory into the entries a single FlatList renders: set
 * headers interleaved with runs of cards.
 *
 * One flat list (rather than SectionList + numColumns) is what lets the binder
 * grid and the "by set" grouping coexist — `numColumns` cannot span a section
 * header, and a SectionList cannot lay its rows out in columns.
 */

/** The card fields grouping needs; `ApiInventoryItem` satisfies it. */
export type GroupableItem = {
  cardId: string;
  isFoil: boolean;
  setCode?: string;
  keyruneCode?: string;
};

export type Entry<T extends GroupableItem> =
  | { kind: "header"; key: string; setCode: string; keyruneCode?: string; count: number }
  | { kind: "row"; key: string; items: T[] };

export function entryKey(item: GroupableItem): string {
  return `${item.cardId}-${item.isFoil}`;
}

/**
 * @param grouped emit a header each time the set changes. The caller must have
 *   asked the API for a set-ordered list, or "changes" won't be contiguous.
 * @param columns cards per row (3 in the binder grid, 1 in the list).
 */
export function buildEntries<T extends GroupableItem>(
  items: T[],
  grouped: boolean,
  columns: number,
): Entry<T>[] {
  // Header counts describe what's *loaded*, not the set's true total — the
  // list is paged, so a later page can add more cards to the same set.
  const counts = new Map<string | undefined, number>();
  for (const item of items) {
    counts.set(item.setCode, (counts.get(item.setCode) ?? 0) + 1);
  }

  const entries: Entry<T>[] = [];
  let pending: T[] = [];
  let currentSet: string | undefined;
  let started = false;

  function flush() {
    if (pending.length === 0) return;
    entries.push({ kind: "row", key: entryKey(pending[0]), items: pending });
    pending = [];
  }

  for (const item of items) {
    if (grouped && (!started || item.setCode !== currentSet)) {
      // A new set starts a new header, and never shares a row with the last one.
      flush();
      currentSet = item.setCode;
      started = true;
      const setCode = item.setCode ?? "";
      entries.push({
        kind: "header",
        key: `header-${setCode}-${entries.length}`,
        setCode,
        keyruneCode: item.keyruneCode,
        count: counts.get(item.setCode) ?? 0,
      });
    }
    pending.push(item);
    if (pending.length === columns) flush();
  }
  flush();
  return entries;
}
