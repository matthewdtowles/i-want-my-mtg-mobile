import { api } from "./client";
import { errMessage } from "./envelope";
import type { ApiPortfolioSummary } from "./types";

// `data` is null until the portfolio has been computed for this user.
export async function fetchPortfolioSummary(): Promise<ApiPortfolioSummary | null> {
  const { data, error, response } = await api.GET("/api/v1/portfolio");
  if (!response.ok) throw new Error(errMessage(error, "Failed to load portfolio."));
  return data?.data ?? null;
}

export async function refreshPortfolio(): Promise<void> {
  const { error, response } = await api.POST("/api/v1/portfolio/refresh", {});
  if (!response.ok) throw new Error(errMessage(error, "Failed to refresh portfolio."));
}
