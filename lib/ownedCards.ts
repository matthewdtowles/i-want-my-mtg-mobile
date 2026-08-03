import type { ApiInventoryQuantity } from "./api/types";

/** What a card is held in, split by finish. */
export type OwnedCounts = { normal: number; foil: number };

/**
 * The answer to "which of these cards do I have?" for one batch of ids.
 *
 * `requested` matters as much as `owned`: the quantities endpoint returns rows
 * only for cards the user holds, so a missing id means "not owned" ONLY when
 * that id was part of the request. Cards loaded after the snapshot was taken
 * are unanswered, and the binder leaves them undimmed rather than claiming the
 * user doesn't own them.
 */
export interface OwnedSnapshot {
  requested: Set<string>;
  owned: Map<string, OwnedCounts>;
}

export function ownedSnapshot(
  cardIds: string[],
  rows: ApiInventoryQuantity[],
): OwnedSnapshot {
  const owned = new Map<string, OwnedCounts>();
  for (const row of rows) {
    const counts = { normal: row.normalQuantity ?? 0, foil: row.foilQuantity ?? 0 };
    if (counts.normal > 0 || counts.foil > 0) owned.set(row.cardId, counts);
  }
  return { requested: new Set(cardIds), owned };
}
