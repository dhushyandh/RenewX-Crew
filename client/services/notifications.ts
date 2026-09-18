import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "renewx_notifications_history";
const SETTINGS_KEY = "renewx_notification_settings";

export type NotificationHistoryItem = {
    id: string;
    title: string;
    body: string;
    receivedAt: string;
    data?: Record<string, any>;
    read: boolean;
};

export type NotificationSettings = {
    orderUpdates: boolean;
    offers: boolean;
    general: boolean;
};

export const DEFAULT_SETTINGS: NotificationSettings = {
    orderUpdates: true,
    offers: true,
    general: true,
};

export async function configureNotifications() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("renewx-orders", {
            name: "Order Updates",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#111111",
        });

        await Notifications.setNotificationChannelAsync("renewx-offers", {
            name: "Offers & Promotions",
            importance: Notifications.AndroidImportance.DEFAULT,
            lightColor: "#FF4C3B",
        });

        await Notifications.setNotificationChannelAsync("renewx-general", {
            name: "General",
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }
}

export async function requestNotificationPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();

    if (existing === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
}

export async function getPushToken(): Promise<string | null> {
    try {
        if (!Device.isDevice) return null;

        const granted = await requestNotificationPermission();
        if (!granted) return null;

        const tokenData = await Notifications.getDevicePushTokenAsync();
        return tokenData.data ?? null;
    } catch (error) {
        console.error("Failed to get push token:", error);
        return null;
    }
}

export async function registerPushToken() {
    const token = await getPushToken();
    if (!token) return;

    try {
        const existing = await AsyncStorage.getItem("renewx_push_token");
        if (existing === token) return;

        await AsyncStorage.setItem("renewx_push_token", token);

        // Register with backend when available
        // await api.post('/notifications/register', { token });
    } catch (error) {
        console.error("Failed to register push token:", error);
    }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
    try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
        // fallthrough
    }
    return DEFAULT_SETTINGS;
}

export async function saveNotificationSettings(settings: NotificationSettings) {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function getNotificationHistory(): Promise<NotificationHistoryItem[]> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // fallthrough
    }
    return [];
}

export async function addNotificationToHistory(
    notification: Notifications.Notification,
) {
    try {
        const history = await getNotificationHistory();

        const item: NotificationHistoryItem = {
            id: notification.request.identifier,
            title: notification.request.content.title ?? "Notification",
            body: notification.request.content.body ?? "",
            receivedAt: new Date().toISOString(),
            data: notification.request.content.data as any,
            read: false,
        };

        const next = [item, ...history].slice(0, 50);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
        console.error("Failed to store notification:", error);
    }
}

export async function markNotificationRead(id: string) {
    const history = await getNotificationHistory();
    const next = history.map((item) =>
        item.id === id ? { ...item, read: true } : item,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function markAllNotificationsRead() {
    const history = await getNotificationHistory();
    const next = history.map((item) => ({ ...item, read: true }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearNotificationHistory() {
    await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data ?? {},
            sound: true,
        },
        trigger: null,
    });
}

// re-export for convenience
import * as Device from "expo-device";
