import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerPaperNotifications() {
  if (Platform.OS === "web") return { granted: false, token: null as string | null };
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("paper-trading", {
      name: "Paper trading alerts",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: "#1D6FE8",
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return { granted: false, token: null as string | null };

  try {
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return { granted: true, token: null as string | null };
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return { granted: true, token };
  } catch {
    return { granted: true, token: null as string | null };
  }
}

export async function showPaperAlert(title: string, body: string) {
  if (Platform.OS === "web") return;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { url: "/notifications" } },
    trigger: null,
  });
}
