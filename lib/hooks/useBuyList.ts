import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BUY_LIST_KEY,
  fetchBuyList,
  removeFromBuyList,
  setBuyListQuantity,
} from "../api/buyList";
import type { ApiBuyListItem } from "../api/types";
import { useDebouncedByKey } from "../useDebouncedByKey";
import { useOptimisticMutation } from "../useOptimisticMutation";

function sameRow(a: ApiBuyListItem, b: { cardId: string; isFoil: boolean }): boolean {
  return a.cardId === b.cardId && a.isFoil === b.isFoil;
}

function upsert(
  items: ApiBuyListItem[] | undefined,
  cardId: string,
  isFoil: boolean,
  quantity: number,
): ApiBuyListItem[] {
  const list = items ?? [];
  const idx = list.findIndex((it) => sameRow(it, { cardId, isFoil }));
  if (idx === -1) {
    return quantity <= 0 ? list : [...list, { cardId, isFoil, quantity }];
  }
  const next = [...list];
  if (quantity <= 0) next.splice(idx, 1);
  else next[idx] = { ...next[idx], quantity };
  return next;
}

/** How many of a card+finish the buy-list currently wants. */
export function wantedQuantity(
  items: ApiBuyListItem[] | undefined,
  cardId: string,
  isFoil: boolean,
): number {
  return items?.find((it) => sameRow(it, { cardId, isFoil }))?.quantity ?? 0;
}

export function useBuyList() {
  return useQuery({ queryKey: BUY_LIST_KEY, queryFn: fetchBuyList });
}

/**
 * The absolute-quantity buy-list writer: `set` upserts the cache instantly
 * (an optimistic insert picks up the card's name/price fields on the settle
 * re-sync) and debounces the server write; `stepBy` steps an existing row
 * from its latest cached value so a rapid double-tap can't read a stale row.
 */
export function useBuyListQuantity() {
  const queryClient = useQueryClient();

  const setQty = useOptimisticMutation<
    ApiBuyListItem[],
    { cardId: string; isFoil: boolean; quantity: number }
  >({
    queryKey: BUY_LIST_KEY,
    mutationFn: ({ cardId, isFoil, quantity }) =>
      setBuyListQuantity(cardId, isFoil, quantity),
    errorTitle: "Couldn't update your buy-list",
    invalidates: [BUY_LIST_KEY],
  });

  const write = useDebouncedByKey((cardId: string, isFoil: boolean, quantity: number) =>
    setQty.mutate({ cardId, isFoil, quantity }),
  );

  function set(cardId: string, isFoil: boolean, quantity: number) {
    queryClient.setQueryData<ApiBuyListItem[]>(BUY_LIST_KEY, (old) =>
      upsert(old, cardId, isFoil, quantity),
    );
    write(`${cardId}-${isFoil}`, cardId, isFoil, quantity);
  }

  function stepBy(item: ApiBuyListItem, delta: number) {
    const current = queryClient
      .getQueryData<ApiBuyListItem[]>(BUY_LIST_KEY)
      ?.find((it) => sameRow(it, item))?.quantity;
    set(item.cardId, item.isFoil, Math.max(1, (current ?? item.quantity) + delta));
  }

  return { set, stepBy };
}

export function useRemoveFromBuyList() {
  return useOptimisticMutation<ApiBuyListItem[], ApiBuyListItem>({
    queryKey: BUY_LIST_KEY,
    mutationFn: (item) => removeFromBuyList(item.cardId, item.isFoil),
    apply: (old, item) => (old ?? []).filter((it) => !sameRow(it, item)),
    errorTitle: "Couldn't remove card",
    invalidates: [BUY_LIST_KEY],
  });
}
