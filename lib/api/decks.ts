import { api } from "./client";
import { errMessage } from "./envelope";
import type {
  ApiDeckCreate,
  ApiDeckDetail,
  ApiDeckImport,
  ApiDeckImportResult,
  ApiDeckSummary,
  ApiDeckUpdate,
} from "./types";

export const DECKS_KEY = ["decks"] as const;
export const deckKey = (id: number) => ["deck", id] as const;

export async function fetchDecks(): Promise<ApiDeckSummary[]> {
  const { data, error, response } = await api.GET("/api/v1/decks");
  if (!response.ok) throw new Error(errMessage(error, "Failed to load decks."));
  return data?.data ?? [];
}

export async function fetchDeck(id: number): Promise<ApiDeckDetail> {
  const { data, error, response } = await api.GET("/api/v1/decks/{id}", {
    params: { path: { id } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load deck."));
  const deck = data?.data;
  if (!deck) throw new Error("Deck not found.");
  return deck;
}

export async function createDeck(body: ApiDeckCreate): Promise<ApiDeckDetail> {
  const { data, error, response } = await api.POST("/api/v1/decks", { body });
  if (!response.ok) throw new Error(errMessage(error, "Failed to create deck."));
  const deck = data?.data;
  if (!deck) throw new Error("Failed to create deck.");
  return deck;
}

export async function importDeck(body: ApiDeckImport): Promise<ApiDeckImportResult> {
  const { data, error, response } = await api.POST("/api/v1/decks/import", { body });
  if (!response.ok) throw new Error(errMessage(error, "Failed to import deck."));
  const result = data?.data;
  if (!result) throw new Error("Failed to import deck.");
  return result;
}

export async function updateDeck(id: number, body: ApiDeckUpdate): Promise<void> {
  const { error, response } = await api.PATCH("/api/v1/decks/{id}", {
    params: { path: { id } },
    body,
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to update deck."));
}

export async function deleteDeck(id: number): Promise<void> {
  const { error, response } = await api.DELETE("/api/v1/decks/{id}", {
    params: { path: { id } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to delete deck."));
}

// Sets an ABSOLUTE quantity keyed by cardId + isSideboard; quantity 0 removes it.
export async function setDeckCardQuantity(
  id: number,
  cardId: string,
  isSideboard: boolean,
  quantity: number,
): Promise<void> {
  const { error, response } = await api.PATCH("/api/v1/decks/{id}/cards", {
    params: { path: { id } },
    body: { cardId, isSideboard, quantity },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to update card."));
}

// Adds the deck's cards you don't own to your buy-list; returns the count added.
export async function deckMissingToBuyList(id: number): Promise<number> {
  const { data, error, response } = await api.POST(
    "/api/v1/decks/{id}/missing-to-buy-list",
    { params: { path: { id } } },
  );
  if (!response.ok) throw new Error(errMessage(error, "Failed to add missing cards."));
  return data?.data?.added ?? 0;
}
