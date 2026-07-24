import { api } from "./client";
import { errMessage } from "./envelope";
import type {
  ApiCard,
  ApiPaginationMeta,
  ApiPriceHistoryPoint,
  ApiSet,
} from "./types";

/** Browse + card catalog query keys. Lists include the page size so a
 * settings change starts a fresh, consistently-sized sequence of pages. */
export const setsKey = (limit: number) => ["sets", limit] as const;
export const setCardsKey = (code: string | undefined, limit: number) =>
  ["set", code, "cards", limit] as const;
export const cardsSearchKey = (q: string) => ["cards", "search", q] as const;
export const cardKey = (setCode: string | undefined, number: string | undefined) =>
  ["card", setCode, number] as const;
export const cardPriceHistoryKey = (cardId: string, days: number) =>
  ["card", cardId, "price-history", days] as const;

export interface Page<T> {
  items: T[];
  meta?: ApiPaginationMeta;
}

export async function fetchSets(page = 1, limit = 50): Promise<Page<ApiSet>> {
  const { data, error, response } = await api.GET("/api/v1/sets", {
    params: { query: { page, limit } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load sets."));
  return { items: data?.data ?? [], meta: data?.meta };
}

export async function fetchSetCards(
  code: string,
  page = 1,
  limit = 50,
): Promise<Page<ApiCard>> {
  const { data, error, response } = await api.GET("/api/v1/sets/{code}/cards", {
    params: { path: { code }, query: { page, limit } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load set cards."));
  return { items: data?.data ?? [], meta: data?.meta };
}

export async function searchCards(
  q: string,
  page = 1,
  limit = 30,
): Promise<Page<ApiCard>> {
  const { data, error, response } = await api.GET("/api/v1/cards", {
    params: { query: { q, page, limit, groupBy: "name" } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Search failed."));
  return { items: data?.data ?? [], meta: data?.meta };
}

export async function fetchCard(
  setCode: string,
  setNumber: string,
): Promise<ApiCard> {
  const { data, error, response } = await api.GET(
    "/api/v1/cards/{setCode}/{setNumber}",
    { params: { path: { setCode, setNumber } } },
  );
  if (response.status === 404) throw new Error("Card not found.");
  if (!response.ok) throw new Error(errMessage(error, "Failed to load card."));
  const card = data?.data;
  if (!card) throw new Error("Card not found.");
  return card;
}

export async function fetchCardPriceHistory(
  cardId: string,
  days: number,
): Promise<ApiPriceHistoryPoint[]> {
  const { data, error, response } = await api.GET(
    "/api/v1/cards/{cardId}/price-history",
    { params: { path: { cardId }, query: { days } } },
  );
  if (!response.ok) throw new Error(errMessage(error, "Failed to load price history."));
  return data?.data ?? [];
}
