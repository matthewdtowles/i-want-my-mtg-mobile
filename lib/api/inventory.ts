import { api } from "./client";
import type { Page } from "./catalog";
import { errMessage } from "./envelope";
import type {
  ApiInventoryItem,
  ApiInventoryQuantity,
  ApiInventoryWrite,
} from "./types";

/** The inventory list. */
export const INVENTORY_KEY = ["inventory"] as const;

/**
 * Server-side list options (the API sorts/filters/pages; the app no longer
 * drains every page client-side). `sort` takes the backend's SortOptions
 * values, e.g. "card.name", "prices.normal", "inventory.quantity".
 */
export interface InventoryListOptions {
  page?: number;
  limit?: number;
  filter?: string;
  sort?: string;
  ascend?: boolean;
}

/**
 * One cached list per filter/sort/limit combination. Kept under the
 * `["inventory"]` prefix so existing invalidations refresh every variant.
 */
export const inventoryListKey = (opts: Omit<InventoryListOptions, "page">) =>
  ["inventory", "list", opts] as const;
/**
 * Per-card owned quantities. Kept under the `["inventory"]` prefix so the
 * existing `invalidateQueries({ queryKey: INVENTORY_KEY })` calls cover it.
 */
export const inventoryQuantitiesKey = (cardId: string) =>
  ["inventory", "quantities", cardId] as const;
/**
 * A deck's owned quantities (for the "missing cards" view). Under the inventory
 * prefix - so inventory edits invalidate it (finding 1.5) - and keyed by the
 * deck's card set so it refetches when the deck's cards change.
 */
export const deckOwnedKey = (deckId: number, cardIds: string[]) =>
  ["inventory", "quantities", "deck", deckId, cardIds] as const;

export async function fetchInventory({
  page = 1,
  limit = 50,
  filter,
  sort,
  ascend,
}: InventoryListOptions = {}): Promise<Page<ApiInventoryItem>> {
  const { data, error, response } = await api.GET("/api/v1/inventory", {
    params: {
      query: {
        page,
        limit,
        ...(filter ? { filter } : {}),
        ...(sort ? { sort, ascend } : {}),
      },
    },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load inventory."));
  return { items: data?.data ?? [], meta: data?.meta };
}

// POST and PATCH are server-identical upserts (set absolute quantity, keyed by
// cardId + isFoil; quantity 0 removes the row). PATCH is the idempotent verb.
export async function saveInventory(
  items: ApiInventoryWrite[],
): Promise<ApiInventoryItem[]> {
  const { data, error, response } = await api.PATCH("/api/v1/inventory", {
    body: items,
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to save inventory."));
  return data?.data ?? [];
}

export async function deleteInventory(cardId: string, isFoil: boolean): Promise<void> {
  const { error, response } = await api.DELETE("/api/v1/inventory", {
    body: { cardId, isFoil },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to remove item."));
}

export async function fetchQuantities(
  cardIds: string[],
): Promise<ApiInventoryQuantity[]> {
  if (cardIds.length === 0) return [];
  const { data, error, response } = await api.GET("/api/v1/inventory/quantities", {
    params: { query: { cardIds: cardIds.join(",") } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load quantities."));
  return data?.data ?? [];
}

/**
 * Add `addQty` of `isFoil` finish to each card's inventory. Because the write
 * API sets an ABSOLUTE quantity (keyed by card + finish), we first read each
 * card's current quantity and write `current + addQty` so existing counts are
 * incremented, not clobbered. Returns the number of rows the server upserted.
 */
export async function bulkAddToInventory(
  cardIds: string[],
  isFoil: boolean,
  addQty: number,
): Promise<number> {
  if (cardIds.length === 0 || addQty <= 0) return 0;
  const current = await fetchQuantities(cardIds);
  const byId = new Map(current.map((q) => [q.cardId, q]));
  const writes: ApiInventoryWrite[] = cardIds.map((cardId) => {
    const q = byId.get(cardId);
    const existing = isFoil ? q?.foilQuantity ?? 0 : q?.normalQuantity ?? 0;
    return { cardId, isFoil, quantity: existing + addQty };
  });
  // Report the server's authoritative upserted-row count, not the request size.
  const saved = await saveInventory(writes);
  return saved.length;
}
