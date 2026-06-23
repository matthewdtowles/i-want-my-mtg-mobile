import { api } from "./client";
import type { Page } from "./catalog";
import type {
  ApiInventoryItem,
  ApiInventoryQuantity,
  ApiInventoryWrite,
} from "./types";

// Non-2xx bodies still carry the { error } envelope field; surface it if present.
function errMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "error" in error) {
    const e = (error as { error?: unknown }).error;
    if (typeof e === "string") return e;
  }
  return fallback;
}

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
