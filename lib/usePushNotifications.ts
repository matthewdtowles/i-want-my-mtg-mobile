import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { NOTIFICATIONS_KEY } from "./api/notifications";
import { registerPushDevice } from "./push";

type PushData = { setCode?: string; cardNumber?: string };

// Registers this device for push once authenticated, refreshes the notifications
// cache when one arrives, and routes to the card (or the inbox) on tap.
export function usePushNotifications(isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;
    void registerPushDevice();
  }, [isAuthenticated]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });
    const response = Notifications.addNotificationResponseReceivedListener((r) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      const data = r.notification.request.content.data as PushData;
      if (data?.setCode && data?.cardNumber) {
        router.push({
          pathname: "/card/[setCode]/[number]",
          params: { setCode: String(data.setCode), number: String(data.cardNumber) },
        });
      } else {
        router.push("/notifications");
      }
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [queryClient, router]);
}
