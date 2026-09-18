import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from "react";
import * as Notifications from "expo-notifications";
import {
    configureNotifications,
    registerPushToken,
    requestNotificationPermission,
    addNotificationToHistory,
    getNotificationSettings,
    saveNotificationSettings,
    getNotificationHistory,
    markAllNotificationsRead,
    clearNotificationHistory,
    type NotificationSettings,
    type NotificationHistoryItem,
} from "../services/notifications";

type NotificationContextValue = {
    permissionGranted: boolean | null;
    pushToken: string | null;
    settings: NotificationSettings;
    history: NotificationHistoryItem[];
    unreadCount: number;
    lastNotification: { title: string; body: string; data?: Record<string, any> } | null;
    updateSettings: (settings: NotificationSettings) => Promise<void>;
    refreshHistory: () => Promise<void>;
    markAllRead: () => Promise<void>;
    clearHistory: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const DEFAULT_SETTINGS: NotificationSettings = {
    orderUpdates: true,
    offers: true,
    general: true,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
    const [lastNotification, setLastNotification] = useState<{
        title: string;
        body: string;
        data?: Record<string, any>;
    } | null>(null);

    const receivedListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    const refreshHistory = useCallback(async () => {
        const items = await getNotificationHistory();
        setHistory(items);
    }, []);

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

            const stored = await getNotificationSettings();
            if (mounted) setSettings(stored);

            await refreshHistory();
        };

        init();

        receivedListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                setLastNotification({
                    title: notification.request.content.title ?? "",
                    body: notification.request.content.body ?? "",
                    data: notification.request.content.data as any,
                });
                addNotificationToHistory(notification).then(refreshHistory);
            },
        );

        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                setLastNotification({
                    title: response.notification.request.content.title ?? "",
                    body: response.notification.request.content.body ?? "",
                    data: response.notification.request.content.data as any,
                });
                addNotificationToHistory(response.notification).then(refreshHistory);
            },
        );

        return () => {
            if (receivedListener.current) {
                Notifications.removeNotificationSubscription(receivedListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
            mounted = false;
        };
    }, [refreshHistory]);

    const updateSettings = useCallback(async (next: NotificationSettings) => {
        setSettings(next);
        await saveNotificationSettings(next);
    }, []);

    const markAllRead = useCallback(async () => {
        await markAllNotificationsRead();
        await refreshHistory();
    }, [refreshHistory]);

    const clearHistory = useCallback(async () => {
        await clearNotificationHistory();
        setHistory([]);
    }, []);

    const unreadCount = history.filter((item) => !item.read).length;

    return (
        <NotificationContext.Provider
            value={{
                permissionGranted,
                pushToken,
                settings,
                history,
                unreadCount,
                lastNotification,
                updateSettings,
                refreshHistory,
                markAllRead,
                clearHistory,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within NotificationProvider");
    }
    return context;
}
