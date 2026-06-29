import { api } from "./client";
import { errMessage } from "./envelope";
import type { ApiBuyListImportResult, ApiBuyListItem } from "./types";

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

// Imports a CSV (header row required; external exports auto-detected) and returns
// the count saved plus any per-line errors.
export async function importBuyList(text: string): Promise<ApiBuyListImportResult> {
  const { data, error, response } = await api.POST("/api/v1/buy-list/import", {
    body: { text },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to import buy-list."));
  const result = data?.data;
  if (!result) throw new Error("Failed to import buy-list.");
  return result;
}
