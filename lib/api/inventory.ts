import { api } from "./client";
import type { Page } from "./catalog";
import { errMessage } from "./envelope";
import type {
  ApiInventoryItem,
  ApiInventoryQuantity,
  ApiInventoryWrite,
} from "./types";

export async function fetchInventory(
  page = 1,
  limit = 50,
): Promise<Page<ApiInventoryItem>> {
  const { data, error, response } = await api.GET("/api/v1/inventory", {
    params: { query: { page, limit } },
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
