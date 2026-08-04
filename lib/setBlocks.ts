/**
 * Flattens a block-grouped set list into the entries the browse gallery's
 * single FlatList renders: block headers interleaved with their sets.
 *
 * Mirrors the web app's `SetListUtils.groupByBlock`, so both clients agree on
 * which blocks get a header and what order the sets inside one appear in.
 */

import type { ApiSet } from "./api/types";

export type SetEntry =
  | { kind: "header"; key: string; blockName: string }
  | { kind: "set"; key: string; set: ApiSet; inBlock: boolean };

interface Group {
  /** The block's `parentCode`-or-own-code key, as the API groups by. */
  key: string;
  blockName: string;
  sets: ApiSet[];
  isMultiSet: boolean;
}

/**
 * @param multiSetBlockKeys the keys the API's `BlockPaginationMeta` flags as
 *   holding more than one set. A block can span more sets than the page
 *   carries, so this — not the page's own count alone — is what decides
 *   whether a single visible set still belongs under a block header.
 */
export function buildSetEntries(
  sets: ApiSet[],
  multiSetBlockKeys: string[] = [],
): SetEntry[] {
  const groups = groupByBlock(sets, new Set(multiSetBlockKeys));
  const entries: SetEntry[] = [];
  for (const group of groups) {
    // A block of one gets no header — a lone set reads as itself, and the
    // gallery would otherwise be mostly labels. `inBlock` is what keeps that
    // readable: a headed block's sets are inset, so the next unheaded set is
    // visibly its own thing rather than one more row under the last header.
    if (group.isMultiSet) {
      // Keyed by the block, not by whichever set sorted first — the block key
      // doesn't depend on which of the block's sets are loaded, so the header
      // can't churn as a FlatList item.
      entries.push({
        kind: "header",
        key: `block-${group.key}`,
        blockName: group.blockName,
      });
    }
    for (const set of group.sets) {
      entries.push({ kind: "set", key: set.code, set, inBlock: group.isMultiSet });
    }
  }
  return entries;
}

function groupByBlock(sets: ApiSet[], multiSetKeys: Set<string>): Group[] {
  const blocks = new Map<string, ApiSet[]>();
  for (const set of sets) {
    // `parentCode` is what ties a promo/token/commander set back to its main
    // one; a set without it is its own block key.
    const key = set.parentCode || set.code;
    const existing = blocks.get(key);
    if (existing) existing.push(set);
    else blocks.set(key, [set]);
  }

  const groups: Group[] = [];
  for (const [key, blockSets] of blocks) {
    // Main set first, then the satellites oldest-first.
    const ordered = [...blockSets].sort((a, b) => {
      if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
      return (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "");
    });
    groups.push({
      key,
      blockName: ordered[0].block || ordered[0].name,
      sets: ordered,
      isMultiSet: ordered.length > 1 || multiSetKeys.has(key),
    });
  }

  // Newest block first, matching the gallery's default release ordering.
  return groups.sort((a, b) =>
    (b.sets[0].releaseDate ?? "").localeCompare(a.sets[0].releaseDate ?? ""),
  );
}
