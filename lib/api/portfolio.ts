import { api } from "./client";
import { errMessage } from "./envelope";
import type { ApiPortfolioSummary } from "./types";

/** The portfolio family (invalidate this prefix to refresh everything). */
export const PORTFOLIO_KEY = ["portfolio"] as const;
export const PORTFOLIO_SUMMARY_KEY = ["portfolio", "summary"] as const;

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
