import { api } from "./client";
import type { Page } from "./catalog";
import { errMessage } from "./envelope";
import type {
  ApiTransaction,
  ApiTransactionUpdate,
  ApiTransactionWrite,
} from "./types";

export const TRANSACTIONS_KEY = ["transactions"] as const;

/** The paged list, keyed by page size + filter (under the prefix above). */
export const transactionsListKey = (limit: number, filter = "") =>
  ["transactions", "list", limit, filter] as const;

export async function fetchTransactions(
  page = 1,
  limit = 50,
  filter?: string,
): Promise<Page<ApiTransaction>> {
  const { data, error, response } = await api.GET("/api/v1/transactions", {
    params: { query: { page, limit, ...(filter ? { filter } : {}) } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load transactions."));
  return { items: data?.data ?? [], meta: data?.meta };
}

export async function createTransaction(
  body: ApiTransactionWrite,
): Promise<ApiTransaction> {
  const { data, error, response } = await api.POST("/api/v1/transactions", { body });
  if (!response.ok) throw new Error(errMessage(error, "Failed to log transaction."));
  const tx = data?.data;
  if (!tx) throw new Error("Failed to log transaction.");
  return tx;
}

export async function updateTransaction(
  id: number,
  body: ApiTransactionUpdate,
): Promise<ApiTransaction> {
  const { data, error, response } = await api.PUT("/api/v1/transactions/{id}", {
    params: { path: { id } },
    body,
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to update transaction."));
  const tx = data?.data;
  if (!tx) throw new Error("Failed to update transaction.");
  return tx;
}

export async function deleteTransaction(id: number): Promise<void> {
  const { error, response } = await api.DELETE("/api/v1/transactions/{id}", {
    params: { path: { id } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to delete transaction."));
}
