import { useQuery } from "@tanstack/react-query";

import {
  PRICE_ALERTS_KEY,
  createPriceAlert,
  deletePriceAlert,
  fetchPriceAlerts,
  updatePriceAlert,
} from "../api/priceAlerts";
import type { ApiPriceAlert, ApiPriceAlertCreate } from "../api/types";
import { useOptimisticMutation } from "../useOptimisticMutation";

export function usePriceAlerts() {
  return useQuery({ queryKey: PRICE_ALERTS_KEY, queryFn: fetchPriceAlerts });
}

export function useCreatePriceAlert() {
  return useOptimisticMutation<ApiPriceAlert[], ApiPriceAlertCreate>({
    queryKey: PRICE_ALERTS_KEY,
    mutationFn: createPriceAlert,
    errorTitle: "Couldn't set alert",
    invalidates: [PRICE_ALERTS_KEY],
  });
}

/** Pause/resume an alert. */
export function useTogglePriceAlert() {
  return useOptimisticMutation<ApiPriceAlert[], ApiPriceAlert>({
    queryKey: PRICE_ALERTS_KEY,
    mutationFn: (alert) => updatePriceAlert(alert.id, { isActive: !alert.isActive }),
    errorTitle: "Couldn't update alert",
    invalidates: [PRICE_ALERTS_KEY],
  });
}

export function useDeletePriceAlert() {
  return useOptimisticMutation<ApiPriceAlert[], number>({
    queryKey: PRICE_ALERTS_KEY,
    mutationFn: (id) => deletePriceAlert(id),
    errorTitle: "Couldn't delete alert",
    invalidates: [PRICE_ALERTS_KEY],
  });
}
