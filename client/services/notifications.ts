import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { getAuthHeaders } from "@/constants/api";

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

// Check if running inside Expo Go store client
export const isExpoGo =
    Constants.appOwnership === "expo" ||
    (Constants as any).executionEnvironment === "storeClient" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;

// Safely initialize expo-notifications without crashing Expo Go (SDK 53+) or Web
if (Platform.OS !== "web") {
    try {
        if (!(isExpoGo && Platform.OS === "android")) {
            Notifications = require("expo-notifications");
            if (Notifications?.setNotificationHandler) {
                Notifications.setNotificationHandler({
                    handleNotification: async () => ({
                        shouldShowAlert: true,
                        shouldPlaySound: true,
                        shouldSetBadge: true,
                        shouldShowBanner: true,
                        shouldShowList: true,
                    }),
                });
            }
        }
    } catch (err: any) {
        console.warn("[Push Notification] expo-notifications load skipped:", err?.message);
    }
}

/**
 * Configure Android notification channels for RenewX.
 */
export async function configureNotifications(): Promise<void> {
    if (Platform.OS !== "android" || !Notifications?.setNotificationChannelAsync) return;

    try {
        await Notifications.setNotificationChannelAsync("renewx-orders", {
            name: "Order Updates",
            description: "Notifications for order confirmation, shipping, and delivery updates",
            importance: Notifications.AndroidImportance?.HIGH ?? 4,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#111111",
            sound: "default",
            enableVibrate: true,
            showBadge: true,
        });

        await Notifications.setNotificationChannelAsync("renewx-offers", {
            name: "Offers & Promotions",
            description: "Exclusive discounts, sales alerts, and seasonal offers",
            importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
            lightColor: "#FF4C3B",
            sound: "default",
        });

        await Notifications.setNotificationChannelAsync("renewx-general", {
            name: "General Notifications",
            description: "Account and general RenewX service updates",
            importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
            lightColor: "#111111",
            sound: "default",
        });
    } catch (error) {
        console.warn("[Push Notification] Failed to set up notification channels:", error);
    }
}

export async function requestNotificationPermission(): Promise<boolean> {
    if (!Notifications?.getPermissionsAsync) return false;
    try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing === "granted") return true;

        const { status } = await Notifications.requestPermissionsAsync();
        return status === "granted";
    } catch (e) {
        console.warn("[Push Notification] Permission request error:", e);
        return false;
    }
}

/**
 * Obtain an Expo Push Token for this device.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    try {
        if (Platform.OS === "web") return null;

        if (isExpoGo && Platform.OS === "android") {
            console.log("[Push Notification] Android push notifications require a Development Build (SDK 53+). Skipping in Expo Go.");
            return null;
        }

        if (!Notifications) return null;

        await configureNotifications();

        if (!Device.isDevice) {
            console.log("[Push Notification] Push notifications require a physical device.");
            return null;
        }

        const granted = await requestNotificationPermission();
        if (!granted) {
            console.warn("[Push Notification] Notification permission was not granted.");
            return null;
        }

        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );

        return tokenData?.data || null;
    } catch (error: any) {
        console.warn("[Push Notification] Failed to get Expo push token:", error?.message || error);
        return null;
    }
}

export async function getPushToken(): Promise<string | null> {
    return registerForPushNotificationsAsync();
}

/**
 * Persist the Expo Push Token to the backend associated with the authenticated user.
 */
export async function registerPushTokenWithBackend(
    token: string,
    getToken?: () => Promise<string | null>
): Promise<boolean> {
    if (!token) return false;

    try {
        const headers = getToken ? await getAuthHeaders(getToken) : {};
        const response = await api.post(
            "/notifications/register",
            {
                token,
                platform: Platform.OS,
            },
            headers
        );
        return response.data?.success === true;
    } catch (error: any) {
        console.warn("Failed to register push token with backend:", error.response?.data || error.message);
        return false;
    }
}

export async function registerPushToken(getToken?: () => Promise<string | null>) {
    const token = await registerForPushNotificationsAsync();
    if (!token) return;

    try {
        const existing = await AsyncStorage.getItem("renewx_push_token");
        if (existing === token) return;

        await AsyncStorage.setItem("renewx_push_token", token);
        await registerPushTokenWithBackend(token, getToken);
    } catch (error) {
        console.error("Failed to register push token:", error);
    }
}

export async function unregisterPushTokenWithBackend(
    token: string,
    getToken?: () => Promise<string | null>
): Promise<boolean> {
    if (!token) return false;

    try {
        const headers = getToken ? await getAuthHeaders(getToken) : {};
        const response = await api.delete("/notifications/unregister", {
            data: { token },
            ...headers,
        });
        return response.data?.success === true;
    } catch (error: any) {
        console.warn("Failed to unregister push token with backend:", error.response?.data || error.message);
        return false;
    }
}

export async function getNotificationSettings(
    getToken?: () => Promise<string | null>
): Promise<NotificationSettings> {
    try {
        if (getToken) {
            const headers = await getAuthHeaders(getToken);
            const { data } = await api.get("/notifications/preferences", headers);
            if (data?.success && data?.data) {
                await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data.data));
                return data.data;
            }
        }
    } catch (_) {}

    try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}

    return DEFAULT_SETTINGS;
}

export async function saveNotificationSettings(
    settings: NotificationSettings,
    getToken?: () => Promise<string | null>
) {
    try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        if (getToken) {
            const headers = await getAuthHeaders(getToken);
            await api.put("/notifications/preferences", settings, headers);
        }
    } catch (err) {
        console.warn("Failed to save notification preferences:", err);
    }
}

export async function getNotificationHistory(): Promise<NotificationHistoryItem[]> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch {}
    return [];
}

export async function addNotificationToHistory(notification: any) {
    try {
        const history = await getNotificationHistory();
        const content = notification?.request?.content || {};

        const item: NotificationHistoryItem = {
            id: notification?.request?.identifier || String(Date.now()),
            title: content.title ?? "Notification",
            body: content.body ?? "",
            receivedAt: new Date().toISOString(),
            data: content.data as any,
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
        item.id === id ? { ...item, read: true } : item
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
    data?: Record<string, any>
) {
    if (!Notifications?.scheduleNotificationAsync) return;
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data ?? {},
                sound: true,
            },
            trigger: null,
        });
    } catch (e) {
        console.warn("[Push Notification] Failed to schedule local notification:", e);
    }
}

/**
 * Safely subscribe to foreground notifications and response taps.
 */
export function setupNotificationListeners({
    onReceived,
    onResponse,
}: {
    onReceived?: (notification: any) => void;
    onResponse?: (response: any) => void;
}): () => void {
    if (!Notifications) return () => {};

    try {
        const receivedSub =
            onReceived && Notifications.addNotificationReceivedListener
                ? Notifications.addNotificationReceivedListener(onReceived)
                : null;

        const responseSub =
            onResponse && Notifications.addNotificationResponseReceivedListener
                ? Notifications.addNotificationResponseReceivedListener(onResponse)
                : null;

        return () => {
            receivedSub?.remove?.();
            responseSub?.remove?.();
        };
    } catch (err) {
        console.warn("[Push Notification] Failed to register notification listeners:", err);
        return () => {};
    }
}
