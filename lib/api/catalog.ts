import { api } from "./client";
import type {
  ApiCard,
  ApiEnvelope,
  ApiPaginationMeta,
  ApiSet,
} from "./types";

export interface Page<T> {
  items: T[];
  meta?: ApiPaginationMeta;
}

// The generated client types these responses as `never` (no OpenAPI response
// schema yet), so we assert the known envelope shape in one place.
function unwrap<T>(data: unknown): ApiEnvelope<T> {
  return (data ?? {}) as ApiEnvelope<T>;
}

function pageFrom<T>(data: unknown): Page<T> {
  const env = unwrap<T[]>(data);
  return { items: env.data ?? [], meta: env.meta };
}

export async function fetchSets(page = 1, limit = 50): Promise<Page<ApiSet>> {
  const { data, error, response } = await api.GET("/api/v1/sets", {
    params: { query: { page, limit } },
  });
  if (!response.ok) throw new Error(unwrap(error).error ?? "Failed to load sets.");
  return pageFrom<ApiSet>(data);
}

export async function fetchSetCards(
  code: string,
  page = 1,
  limit = 50,
): Promise<Page<ApiCard>> {
  const { data, error, response } = await api.GET("/api/v1/sets/{code}/cards", {
    params: { path: { code }, query: { page, limit } },
  });
  if (!response.ok)
    throw new Error(unwrap(error).error ?? "Failed to load set cards.");
  return pageFrom<ApiCard>(data);
}

export async function searchCards(
  q: string,
  page = 1,
  limit = 30,
): Promise<Page<ApiCard>> {
  const { data, error, response } = await api.GET("/api/v1/cards", {
    params: { query: { q, page, limit, groupBy: "name" } },
  });
  if (!response.ok)
    throw new Error(unwrap(error).error ?? "Search failed.");
  return pageFrom<ApiCard>(data);
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
  if (!response.ok)
    throw new Error(unwrap(error).error ?? "Failed to load card.");
  const card = unwrap<ApiCard>(data).data;
  if (!card) throw new Error("Card not found.");
  return card;
}
