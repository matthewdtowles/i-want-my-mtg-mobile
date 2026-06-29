import { api } from "./client";
import { errMessage } from "./envelope";
import type { ApiPriceAlert, ApiPriceAlertCreate, ApiPriceAlertUpdate } from "./types";

export const PRICE_ALERTS_KEY = ["price-alerts"] as const;

export async function fetchPriceAlerts(): Promise<ApiPriceAlert[]> {
  const { data, error, response } = await api.GET("/api/v1/price-alerts");
  if (!response.ok) throw new Error(errMessage(error, "Failed to load price alerts."));
  return data?.data ?? [];
}

// Percent thresholds: at least one of increasePct / decreasePct is required.
export async function createPriceAlert(body: ApiPriceAlertCreate): Promise<void> {
  const { error, response } = await api.POST("/api/v1/price-alerts", { body });
  if (!response.ok) throw new Error(errMessage(error, "Failed to create price alert."));
}

export async function updatePriceAlert(id: number, body: ApiPriceAlertUpdate): Promise<void> {
  const { error, response } = await api.PATCH("/api/v1/price-alerts/{id}", {
    params: { path: { id } },
    body,
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to update price alert."));
}

export async function deletePriceAlert(id: number): Promise<void> {
  const { error, response } = await api.DELETE("/api/v1/price-alerts/{id}", {
    params: { path: { id } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to delete price alert."));
}
