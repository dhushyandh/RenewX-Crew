import React, { useCallback } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Alert,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { COLORS } from "@/constants";
import { useNotifications } from "../../../context/NotificationContext";

export default function NotificationsScreen() {
    const router = useRouter();
    const { history, unreadCount, markAllRead, clearHistory, refreshHistory } =
        useNotifications();

    const handleClearAll = useCallback(() => {
        if (history.length === 0) return;
        Alert.alert(
            "Clear all notifications?",
            "This will remove all notifications from your history.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: () => clearHistory(),
                },
            ],
        );
    }, [history.length, clearHistory]);

    const handleMarkAllRead = useCallback(() => {
        if (unreadCount === 0) return;
        markAllRead();
    }, [unreadCount, markAllRead]);

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.screen}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                        hitSlop={10}
                    >
                        <Ionicons name="arrow-back" size={22} color="#171717" />
                    </Pressable>

                    <Text style={styles.headerTitle}>Notifications</Text>

                    <View style={styles.headerActions}>
                        {unreadCount > 0 && (
                            <Pressable
                                onPress={handleMarkAllRead}
                                style={styles.headerAction}
                                hitSlop={10}
                            >
                                <Ionicons
                                    name="checkmark-done-outline"
                                    size={20}
                                    color={COLORS.primary}
                                />
                            </Pressable>
                        )}
                        {history.length > 0 && (
                            <Pressable
                                onPress={handleClearAll}
                                style={styles.headerAction}
                                hitSlop={10}
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={19}
                                    color={COLORS.accent}
                                />
                            </Pressable>
                        )}
                    </View>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={false}
                            onRefresh={refreshHistory}
                            tintColor={COLORS.primary}
                        />
                    }
                >
                    {history.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Ionicons
                                    name="notifications-outline"
                                    size={40}
                                    color="#55555D"
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                No Notifications Yet
                            </Text>
                            <Text style={styles.emptyDescription}>
                                Order updates, offers, and announcements will
                                appear here when they arrive.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {history.map((item: any, index: number) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.notificationCard,
                                        !item.read && styles.unreadCard,
                                        index === history.length - 1 &&
                                            styles.lastCard,
                                    ]}
                                >
                                    <View style={styles.notificationIcon}>
                                        <Ionicons
                                            name={
                                                item.data?.type === "order"
                                                    ? "cube-outline"
                                                    : item.data?.type === "offer"
                                                      ? "pricetag-outline"
                                                      : "notifications-outline"
                                            }
                                            size={20}
                                            color={COLORS.primary}
                                        />
                                    </View>

                                    <View style={styles.notificationContent}>
                                        <View style={styles.notificationHeader}>
                                            <Text
                                                style={[
                                                    styles.notificationTitle,
                                                    !item.read &&
                                                        styles.unreadTitle,
                                                ]}
                                                numberOfLines={2}
                                            >
                                                {item.title}
                                            </Text>
                                            {!item.read && (
                                                <View style={styles.unreadDot} />
                                            )}
                                        </View>

                                        {item.body ? (
                                            <Text
                                                style={styles.notificationBody}
                                                numberOfLines={3}
                                            >
                                                {item.body}
                                            </Text>
                                        ) : null}

                                        <Text style={styles.notificationTime}>
                                            {formatTime(item.receivedAt)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F8F8F8",
    },
    screen: {
        flex: 1,
        backgroundColor: "#F8F8F8",
    },
    header: {
        height: 58,
        paddingHorizontal: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#EAEAEA",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#F5F5F6",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#151515",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerAction: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#F5F5F6",
        alignItems: "center",
        justifyContent: "center",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#F3F3F4",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#171717",
        marginBottom: 8,
    },
    emptyDescription: {
        maxWidth: 300,
        fontSize: 13,
        lineHeight: 20,
        color: "#85858B",
        textAlign: "center",
    },
    listContainer: {
        maxWidth: 560,
        alignSelf: "center",
        width: "100%",
    },
    notificationCard: {
        flexDirection: "row",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EEEEEE",
        marginBottom: 10,
    },
    unreadCard: {
        borderColor: "#DDDDDD",
        backgroundColor: "#FCFCFC",
    },
    lastCard: {
        marginBottom: 0,
    },
    notificationIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: "#F5F5F6",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 13,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    notificationTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: "#222222",
        lineHeight: 19,
    },
    unreadTitle: {
        fontWeight: "700",
        color: "#111111",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.accent,
        marginLeft: 8,
        marginTop: 6,
    },
    notificationBody: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 18,
        color: "#85858B",
    },
    notificationTime: {
        marginTop: 8,
        fontSize: 11,
        color: "#AAAAAA",
    },
});
