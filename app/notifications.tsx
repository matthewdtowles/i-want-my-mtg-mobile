import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Page } from "../lib/api/catalog";
import {
  NOTIFICATIONS_KEY,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/api/notifications";
import type { ApiNotification } from "../lib/api/types";
import { NotificationListItem } from "../components/NotificationListItem";
import { ErrorState } from "../components/ErrorState";
import { useNotifications } from "../lib/useNotifications";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type NotificationData = InfiniteData<Page<ApiNotification>>;

function mapItems(
  data: NotificationData | undefined,
  fn: (items: ApiNotification[]) => ApiNotification[],
): NotificationData | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((p) => ({ ...p, items: fn(p.items) })) };
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { query, items, unread } = useNotifications();

  const markRead = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    async onMutate(id) {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previous = queryClient.getQueryData<NotificationData>(NOTIFICATIONS_KEY);
      queryClient.setQueryData<NotificationData>(NOTIFICATIONS_KEY, (old) =>
        mapItems(old, (list) =>
          list.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        ),
      );
      return { previous };
    },
    onError(_err, _id, ctx) {
      if (ctx?.previous) queryClient.setQueryData(NOTIFICATIONS_KEY, ctx.previous);
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    async onMutate() {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previous = queryClient.getQueryData<NotificationData>(NOTIFICATIONS_KEY);
      queryClient.setQueryData<NotificationData>(NOTIFICATIONS_KEY, (old) =>
        mapItems(old, (list) => list.map((n) => ({ ...n, isRead: true }))),
      );
      return { previous };
    },
    onError(_err, _vars, ctx) {
      if (ctx?.previous) queryClient.setQueryData(NOTIFICATIONS_KEY, ctx.previous);
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });

  function onPressItem(item: ApiNotification) {
    if (!item.isRead) markRead.mutate(item.id);
    if (item.setCode && item.cardNumber) {
      router.push({
        pathname: "/card/[setCode]/[number]",
        params: { setCode: item.setCode, number: item.cardNumber },
      });
    }
  }

  const header = (
    <Stack.Screen
      options={{
        title: "Notifications",
        headerBackTitle: "Back",
        headerRight: () =>
          unread > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={() => markAll.mutate()}
              style={styles.markAllBtn}
              accessibilityLabel="Mark all as read"
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (query.isPending) {
    return (
      <>
        {header}
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        {header}
        <ErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : "Failed to load notifications."
          }
          onRetry={() => query.refetch()}
        />
      </>
    );
  }
  if (items.length === 0) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <Text style={styles.empty}>No notifications yet.</Text>
          <Text style={styles.emptyHint}>
            Set a price alert on a card and you’ll be notified here when it moves.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      {header}
      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => (
          <NotificationListItem item={item} onPress={() => onPressItem(item)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            tintColor={colors.accent}
          />
        }
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    empty: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
    emptyHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
    },
    markAllBtn: { paddingHorizontal: 12 },
    markAllText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  });
