import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  INVENTORY_KEY,
  fetchQuantities,
  inventoryQuantitiesKey,
  saveInventory,
} from "../api/inventory";
import type { ApiInventoryQuantity } from "../api/types";
import { useDebouncedByKey } from "../useDebouncedByKey";
import { useOptimisticMutation } from "../useOptimisticMutation";

function readQty(rows: ApiInventoryQuantity[] | undefined, cardId: string) {
  const row = rows?.find((r) => r.cardId === cardId);
  return { normal: row?.normalQuantity ?? 0, foil: row?.foilQuantity ?? 0 };
}

function upsertQty(
  rows: ApiInventoryQuantity[] | undefined,
  cardId: string,
  isFoil: boolean,
  quantity: number,
): ApiInventoryQuantity[] {
  const current = readQty(rows, cardId);
  const next: ApiInventoryQuantity = {
    cardId,
    normalQuantity: isFoil ? current.normal : quantity,
    foilQuantity: isFoil ? quantity : current.foil,
  };
  const others = (rows ?? []).filter((r) => r.cardId !== cardId);
  return [...others, next];
}

/**
 * A card's owned quantities plus the absolute-quantity stepper writer: `step`
 * updates the cache instantly and debounces the server write, and settle
 * re-syncs the whole inventory family (INVENTORY_KEY covers this card's
 * inventoryQuantitiesKey too).
 */
export function useCardInventoryQuantities(cardId: string) {
  const queryClient = useQueryClient();
  const key = inventoryQuantitiesKey(cardId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchQuantities([cardId]),
  });

  const setQty = useOptimisticMutation<
    ApiInventoryQuantity[],
    { isFoil: boolean; quantity: number }
  >({
    queryKey: key,
    mutationFn: ({ isFoil, quantity }) => saveInventory([{ cardId, quantity, isFoil }]),
    errorTitle: "Couldn't update quantity",
    invalidates: [INVENTORY_KEY],
  });

  const writeQty = useDebouncedByKey((isFoil: boolean, quantity: number) =>
    setQty.mutate({ isFoil, quantity }),
  );

  function step(isFoil: boolean, quantity: number) {
    queryClient.setQueryData<ApiInventoryQuantity[]>(key, (old) =>
      upsertQty(old, cardId, isFoil, quantity),
    );
    writeQty(isFoil ? "foil" : "normal", isFoil, quantity);
  }

  return { query, owned: readQty(query.data, cardId), step };
}
