import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { Alert } from "react-native";

type Options<TCache, TVars, TData> = {
  /** The cache entry being optimistically edited (cancelled on mutate when `apply` is set). */
  queryKey: QueryKey;
  mutationFn: (vars: TVars) => Promise<TData>;
  /**
   * Optimistically rewrite the cached value. Omit for mutations that update
   * the cache in their tap handler (the debounced quantity writes) or don't
   * need cache surgery — the error-alert and settle-invalidation conventions
   * still apply.
   */
  apply?: (old: TCache | undefined, vars: TVars) => TCache | undefined;
  /** Alert title on failure; the error's message becomes the body. */
  errorTitle: string;
  /** Keys to invalidate on settle, so server state re-syncs and drift self-heals. */
  invalidates?: QueryKey[];
  onSuccess?: (data: TData, vars: TVars) => void;
};

/**
 * Optimistic mutation with the app's conventions baked in (MB7 2.5): the
 * cancel → snapshot → setQueryData → rollback dance is written once, every
 * failure surfaces an Alert instead of a silent revert (finding 1.3), and
 * settle-time invalidation is declared per call site (finding 1.6).
 */
export function useOptimisticMutation<TCache, TVars = void, TData = unknown>({
  queryKey,
  mutationFn,
  apply,
  errorTitle,
  invalidates,
  onSuccess,
}: Options<TCache, TVars, TData>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    async onMutate(vars: TVars) {
      if (!apply) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TCache>(queryKey);
      queryClient.setQueryData<TCache>(queryKey, (old) => apply(old, vars));
      return { previous };
    },
    onError(err, _vars, ctx) {
      // previous === undefined means the cache was empty at mutate time, so no
      // optimistic value was written (setQueryData bails on undefined) and
      // there is nothing to restore; settle-time invalidation re-syncs anyway.
      if (apply && ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
      Alert.alert(errorTitle, err instanceof Error ? err.message : "Please try again.");
    },
    onSuccess(data, vars) {
      onSuccess?.(data, vars);
    },
    onSettled() {
      for (const key of invalidates ?? []) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
