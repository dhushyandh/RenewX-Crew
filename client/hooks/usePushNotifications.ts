import { useEffect, useRef, useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
    configureNotifications,
    registerPushToken,
    requestNotificationPermission,
    addNotificationToHistory,
    getNotificationSettings,
    type NotificationSettings,
} from "../services/notifications";

export type NotificationPayload = {
    title: string;
    body: string;
    data?: Record<string, any>;
};

export function usePushNotifications() {
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [lastNotification, setLastNotification] = useState<NotificationPayload | null>(null);
    const [settings, setSettings] = useState<NotificationSettings | null>(null);

    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            await configureNotifications();

            const granted = await requestNotificationPermission();
            if (!mounted) return;
            setPermissionGranted(granted);

            if (granted) {
                await registerPushToken();
                const tokenData = await Notifications.getDevicePushTokenAsync();
                if (mounted) setPushToken(tokenData.data ?? null);
            }

            const storedSettings = await getNotificationSettings();
            if (mounted) setSettings(storedSettings);
        };

        init();

        // Foreground notification listener
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                const payload: NotificationPayload = {
                    title: notification.request.content.title ?? "",
                    body: notification.request.content.body ?? "",
                    data: notification.request.content.data as any,
                };
                setLastNotification(payload);
                addNotificationToHistory(notification);
            },
        );

        // Tap-on-notification listener
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const payload: NotificationPayload = {
                    title: response.notification.request.content.title ?? "",
                    body: response.notification.request.content.body ?? "",
                    data: response.notification.request.content.data as any,
                };
                setLastNotification(payload);
                addNotificationToHistory(response.notification);
            },
        );

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
            mounted = false;
        };
    }, []);

    const refreshSettings = useCallback(async () => {
        const stored = await getNotificationSettings();
        setSettings(stored);
    }, []);

    return {
        permissionGranted,
        pushToken,
        lastNotification,
        settings,
        refreshSettings,
    };
}
