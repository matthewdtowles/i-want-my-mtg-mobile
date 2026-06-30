import { api } from "./client";
import { errMessage } from "./envelope";

export type DevicePlatform = "ios" | "android" | "web";

export async function registerDevice(token: string, platform: DevicePlatform): Promise<void> {
  const { error, response } = await api.POST("/api/v1/notifications/devices", {
    body: { token, platform },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to register device."));
}

export async function unregisterDevice(token: string): Promise<void> {
  const { error, response } = await api.DELETE("/api/v1/notifications/devices", {
    body: { token },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to unregister device."));
}
