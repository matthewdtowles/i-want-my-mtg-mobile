import { api } from "./client";
import { errMessage } from "./envelope";
import { PAGE_SIZE } from "../pagination";
import type {
  ApiCard,
  ApiPaginationMeta,
  ApiPriceHistoryPoint,
  ApiSet,
} from "./types";

/**
 * How the browse screen can order the set list. The values are the backend's
 * `SortOptions` strings, which `/api/v1/sets` validates against its SET_SORTS
 * allow-list — anything else 400s.
 */
export type SetSort = "set.releaseDate" | "set.name";

export interface SetListOptions {
  /** Substring match on set name. */
  filter?: string;
  sort?: SetSort;
  ascend?: boolean;
  /**
   * Main sets only, dropping promos, masters, decks, and the rest. The API
   * treats a missing `baseOnly` as `true`, so "show me everything" has to send
   * `false` — omitting it is not the wider list, it's the narrower one.
   */
  baseOnly?: boolean;
}

export interface SetCardsOptions {
  /** Substring match on card name. */
  filter?: string;
  /** Base-set cards only — drops the showcase/borderless extras. Defaults true, as above. */
  baseOnly?: boolean;
}

/**
 * What a card search returns per matching name: `unique` collapses to the
 * newest printing (the backend's `groupBy=name`), `printings` lists every
 * printing of every match.
 */
export type CardSearchMode = "unique" | "printings";

/** Browse + card catalog query keys. */
export const setsKey = (opts: SetListOptions) => ["sets", opts] as const;
export const setCardsKey = (code: string | undefined, opts: SetCardsOptions = {}) =>
  ["set", code, "cards", opts] as const;
export const cardsSearchKey = (q: string, mode: CardSearchMode = "unique") =>
  ["cards", "search", q, mode] as const;
export const cardKey = (setCode: string | undefined, number: string | undefined) =>
  ["card", setCode, number] as const;
export const cardPriceHistoryKey = (cardId: string, days: number) =>
  ["card", cardId, "price-history", days] as const;

export interface Page<T> {
  items: T[];
  meta?: ApiPaginationMeta;
}

export async function fetchSets(
  page = 1,
  { filter, sort, ascend, baseOnly }: SetListOptions = {},
): Promise<Page<ApiSet>> {
  const { data, error, response } = await api.GET("/api/v1/sets", {
    params: {
      query: {
        page,
        limit: PAGE_SIZE,
        ...(filter ? { filter } : {}),
        // `ascend` only means something alongside a sort; without one the API
        // falls back to its default (newest first).
        ...(sort ? { sort, ascend } : {}),
        ...(baseOnly === undefined ? {} : { baseOnly }),
      },
    },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load sets."));
  return { items: data?.data ?? [], meta: data?.meta };
}

export async function fetchSetCards(
  code: string,
  page = 1,
  { filter, baseOnly }: SetCardsOptions = {},
): Promise<Page<ApiCard>> {
  const { data, error, response } = await api.GET("/api/v1/sets/{code}/cards", {
    params: {
      path: { code },
      query: {
        page,
        limit: PAGE_SIZE,
        ...(filter ? { filter } : {}),
        ...(baseOnly === undefined ? {} : { baseOnly }),
      },
    },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load set cards."));
  return { items: data?.data ?? [], meta: data?.meta };
}

export async function searchCards(
  q: string,
  page = 1,
  mode: CardSearchMode = "unique",
  limit = 30,
): Promise<Page<ApiCard>> {
  const { data, error, response } = await api.GET("/api/v1/cards", {
    params: {
      query: {
        q,
        page,
        limit,
        // Without `groupBy` the API's default is one row per printing, which is
        // exactly what "printings" wants.
        ...(mode === "unique" ? { groupBy: "name" as const } : {}),
      },
    },
  });
  if (!response.ok) throw new Error(errMessage(error, "Search failed."));
  return { items: data?.data ?? [], meta: data?.meta };
}

/** One set's detail (name, sizes, symbol, owned stats when signed in). */
export const setKey = (code: string | undefined) => ["set", code, "detail"] as const;

export async function fetchSet(code: string): Promise<ApiSet> {
  const { data, error, response } = await api.GET("/api/v1/sets/{code}", {
    params: { path: { code } },
  });
  if (response.status === 404) throw new Error("Set not found.");
  if (!response.ok) throw new Error(errMessage(error, "Failed to load set."));
  const set = data?.data;
  if (!set) throw new Error("Set not found.");
  return set;
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
