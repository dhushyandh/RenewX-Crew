import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { useAuth } from "@clerk/expo";
import {
    configureNotifications,
    registerForPushNotificationsAsync,
    registerPushTokenWithBackend,
    requestNotificationPermission,
    addNotificationToHistory,
    getNotificationSettings,
    saveNotificationSettings,
    getNotificationHistory,
    markAllNotificationsRead,
    clearNotificationHistory,
    setupNotificationListeners,
    type NotificationSettings,
    type NotificationHistoryItem,
    DEFAULT_SETTINGS,
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { isSignedIn, getToken } = useAuth();
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
    const [lastNotification, setLastNotification] = useState<{
        title: string;
        body: string;
        data?: Record<string, any>;
    } | null>(null);

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
                const token = await registerForPushNotificationsAsync();
                if (mounted && token) {
                    setPushToken(token);
                    if (isSignedIn) {
                        await registerPushTokenWithBackend(token, () => getToken());
                    }
                }
            }

            const stored = await getNotificationSettings(isSignedIn ? () => getToken() : undefined);
            if (mounted) setSettings(stored);

            await refreshHistory();
        };

        init();
    }, [isSignedIn]);

    useEffect(() => {
        const cleanup = setupNotificationListeners({
            onReceived: (notification) => {
                setLastNotification({
                    title: notification?.request?.content?.title ?? "",
                    body: notification?.request?.content?.body ?? "",
                    data: notification?.request?.content?.data as any,
                });
                addNotificationToHistory(notification).then(refreshHistory);
            },
            onResponse: (response) => {
                const data = response?.notification?.request?.content?.data;
                console.log("[Push Notification] Response received with data:", data);
            },
        });

        return cleanup;
    }, [refreshHistory]);

    const updateSettings = useCallback(
        async (newSettings: NotificationSettings) => {
            setSettings(newSettings);
            await saveNotificationSettings(
                newSettings,
                isSignedIn ? () => getToken() : undefined
            );
        },
        [isSignedIn, getToken]
    );

    const markAllRead = useCallback(async () => {
        await markAllNotificationsRead();
        await refreshHistory();
    }, [refreshHistory]);

    const clearHistory = useCallback(async () => {
        await clearNotificationHistory();
        await refreshHistory();
    }, [refreshHistory]);

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
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
