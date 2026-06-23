import { api } from "./client";
import type { Page } from "./catalog";
import { errMessage } from "./envelope";
import type { ApiTransaction, ApiTransactionWrite } from "./types";

export async function fetchTransactions(
  page = 1,
  limit = 50,
): Promise<Page<ApiTransaction>> {
  const { data, error, response } = await api.GET("/api/v1/transactions", {
    params: { query: { page, limit } },
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
