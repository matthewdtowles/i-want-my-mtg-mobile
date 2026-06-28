import { api } from "./client";
import { errMessage } from "./envelope";
import type { ApiBuyListItem } from "./types";

export async function fetchBuyList(): Promise<ApiBuyListItem[]> {
  const { data, error, response } = await api.GET("/api/v1/buy-list");
  if (!response.ok) throw new Error(errMessage(error, "Failed to load buy-list."));
  return data?.data ?? [];
}

// Sets an ABSOLUTE quantity keyed by cardId + isFoil; quantity 0 removes the
// row (same upsert shape as inventory's PATCH).
export async function setBuyListQuantity(
  cardId: string,
  isFoil: boolean,
  quantity: number,
): Promise<void> {
  const { error, response } = await api.PATCH("/api/v1/buy-list", {
    body: { cardId, isFoil, quantity },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to update buy-list."));
}

export async function removeFromBuyList(cardId: string, isFoil: boolean): Promise<void> {
  const { error, response } = await api.DELETE("/api/v1/buy-list", {
    body: { cardId, isFoil },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to remove item."));
}
