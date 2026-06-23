import { api } from "./client";
import type { ApiCard, ApiPaginationMeta, ApiSet } from "./types";

export interface Page<T> {
  items: T[];
  meta?: ApiPaginationMeta;
}

// Non-2xx bodies still carry the { error } envelope field; surface it if present.
function errMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "error" in error) {
    const e = (error as { error?: unknown }).error;
    if (typeof e === "string") return e;
  }
  return fallback;
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
