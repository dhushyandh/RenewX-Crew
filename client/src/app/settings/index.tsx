import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";

import { COLORS } from "@/constants";
import { useNotifications } from "../../../context/NotificationContext";

export default function Settings() {
    const router = useRouter();
    const clerk = useClerk();
    const { user } = useUser();

    const {
        settings: notificationSettings,
        updateSettings: updateNotificationSettings,
        permissionGranted,
    } = useNotifications();

    const notifications = notificationSettings.general;
    const orderUpdates = notificationSettings.orderUpdates;
    const offers = notificationSettings.offers;

    const handleToggle = useCallback(
        (key: "general" | "orderUpdates" | "offers", value: boolean) => {
            updateNotificationSettings({
                ...notificationSettings,
                [key]: value,
            });
        },
        [notificationSettings, updateNotificationSettings],
    );

    const fullName = useMemo(() => {
        if (!user) return "Guest User";

        return (
            user.fullName ||
            [user.firstName, user.lastName]
                .filter(Boolean)
                .join(" ") ||
            user.username ||
            "User"
        );
    }, [user]);

    const email =
        user?.primaryEmailAddress?.emailAddress ?? "";

    const handleHelp = useCallback(() => {
        Alert.alert(
            "Help & Support",
            "Need help with RenewX? Please contact the RenewX support team."
        );
    }, []);

    const handlePrivacy = useCallback(() => {
        Alert.alert(
            "Privacy",
            "Your account information is securely managed through Clerk. Privacy policy content can be connected here when your production policy page is ready."
        );
    }, []);

    const handleDeleteAccount = useCallback(() => {
        Alert.alert(
            "Delete Account",
            "Account deletion is a permanent action. Please contact support to request account deletion.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Contact Support",
                    onPress: handleHelp,
                },
            ]
        );
    }, [handleHelp]);

    const handleSignOut = useCallback(() => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await clerk.signOut();
                            router.replace("/");
                        } catch (error) {
                            console.error(
                                "Settings sign out failed:",
                                error
                            );

                            Alert.alert(
                                "Error",
                                "Unable to sign out right now."
                            );
                        }
                    },
                },
            ]
        );
    }, [clerk, router]);

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top"]}
        >
            <View style={styles.screen}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                        hitSlop={10}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color="#171717"
                        />
                    </Pressable>

                    <Text style={styles.headerTitle}>
                        Settings
                    </Text>

                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={
                        styles.scrollContent
                    }
                >
                    <View style={styles.content}>
                        {/* Account */}
                        <Text style={styles.sectionTitle}>
                            Account
                        </Text>

                        <View style={styles.card}>
                            <View style={styles.accountRow}>
                                <View
                                    style={
                                        styles.accountIcon
                                    }
                                >
                                    <Ionicons
                                        name="person-outline"
                                        size={21}
                                        color="#333333"
                                    />
                                </View>

                                <View
                                    style={
                                        styles.accountInfo
                                    }
                                >
                                    <Text
                                        style={
                                            styles.accountName
                                        }
                                        numberOfLines={1}
                                    >
                                        {fullName}
                                    </Text>

                                    <Text
                                        style={
                                            styles.accountEmail
                                        }
                                        numberOfLines={1}
                                    >
                                        {email ||
                                            "No email available"}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Preferences */}
                        <Text
                            style={[
                                styles.sectionTitle,
                                styles.sectionSpacing,
                            ]}
                        >
                            Preferences
                        </Text>

                        <View style={styles.card}>
                            <SettingSwitch
                                icon="notifications-outline"
                                title="Notifications"
                                description={
                                    permissionGranted === false
                                        ? "Permission denied - enable in system settings"
                                        : "Receive important app notifications"
                                }
                                value={notifications}
                                onValueChange={(v) =>
                                    handleToggle("general", v)
                                }
                            />

                            <View
                                style={
                                    styles.separator
                                }
                            />

                            <SettingSwitch
                                icon="cube-outline"
                                title="Order Updates"
                                description="Get updates about your orders"
                                value={orderUpdates}
                                onValueChange={(v) =>
                                    handleToggle("orderUpdates", v)
                                }
                            />

                            <View
                                style={
                                    styles.separator
                                }
                            />

                            <SettingSwitch
                                icon="pricetag-outline"
                                title="Offers & Promotions"
                                description="Receive deals and special offers"
                                value={offers}
                                onValueChange={(v) =>
                                    handleToggle("offers", v)
                                }
                            />
                        </View>

                        {/* Support */}
                        <Text
                            style={[
                                styles.sectionTitle,
                                styles.sectionSpacing,
                            ]}
                        >
                            Support
                        </Text>

                        <View style={styles.card}>
                            <SettingButton
                                icon="help-circle-outline"
                                title="Help & Support"
                                description="Get help with your RenewX account"
                                onPress={handleHelp}
                            />

                            <View
                                style={
                                    styles.separator
                                }
                            />

                            <SettingButton
                                icon="shield-checkmark-outline"
                                title="Privacy"
                                description="Learn how your data is handled"
                                onPress={handlePrivacy}
                            />
                        </View>

                        {/* Account danger */}
                        <Text
                            style={[
                                styles.sectionTitle,
                                styles.sectionSpacing,
                            ]}
                        >
                            Account
                        </Text>

                        <View style={styles.card}>
                            <SettingButton
                                icon="log-out-outline"
                                title="Sign Out"
                                description="Sign out from this device"
                                danger
                                onPress={handleSignOut}
                            />

                            <View
                                style={
                                    styles.separator
                                }
                            />

                            <SettingButton
                                icon="trash-outline"
                                title="Delete Account"
                                description="Request permanent account deletion"
                                danger
                                onPress={
                                    handleDeleteAccount
                                }
                            />
                        </View>

                        <Text style={styles.footer}>
                            RenewX
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

function SettingSwitch({
    icon,
    title,
    description,
    value,
    onValueChange,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}) {
    return (
        <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
                <Ionicons
                    name={icon}
                    size={20}
                    color="#333333"
                />
            </View>

            <View style={styles.settingText}>
                <Text style={styles.settingTitle}>
                    {title}
                </Text>

                <Text style={styles.settingDescription}>
                    {description}
                </Text>
            </View>

            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{
                    false: "#D8D8DC",
                    true: "#777777",
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D8D8DC"
            />
        </View>
    );
}

function SettingButton({
    icon,
    title,
    description,
    onPress,
    danger = false,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    onPress: () => void;
    danger?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.pressedRow,
            ]}
        >
            <View
                style={[
                    styles.settingIcon,
                    danger && styles.dangerIcon,
                ]}
            >
                <Ionicons
                    name={icon}
                    size={20}
                    color={
                        danger
                            ? "#B84E4E"
                            : "#333333"
                    }
                />
            </View>

            <View style={styles.settingText}>
                <Text
                    style={[
                        styles.settingTitle,
                        danger && styles.dangerText,
                    ]}
                >
                    {title}
                </Text>

                <Text style={styles.settingDescription}>
                    {description}
                </Text>
            </View>

            <Ionicons
                name="chevron-forward"
                size={18}
                color="#A0A0A5"
            />
        </Pressable>
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
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth:
            StyleSheet.hairlineWidth,
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

    headerSpacer: {
        width: 38,
    },

    scrollContent: {
        flexGrow: 1,
        paddingBottom: 35,
    },

    content: {
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingHorizontal: 20,
        paddingTop: 26,
    },

    sectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#77777D",
        textTransform: "uppercase",
        letterSpacing: 0.7,
        marginBottom: 9,
        paddingHorizontal: 2,
    },

    sectionSpacing: {
        marginTop: 23,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EEEEEE",
        overflow: "hidden",
    },

    accountRow: {
        minHeight: 86,
        paddingHorizontal: 17,
        flexDirection: "row",
        alignItems: "center",
    },

    accountIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#F2F2F3",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 13,
    },

    accountInfo: {
        flex: 1,
    },

    accountName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#181818",
        marginBottom: 4,
    },

    accountEmail: {
        fontSize: 12,
        color: "#8C8C92",
    },

    settingRow: {
        minHeight: 72,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
    },

    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#F5F5F6",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },

    dangerIcon: {
        backgroundColor: "#FFF4F4",
    },

    settingText: {
        flex: 1,
        paddingRight: 12,
    },

    settingTitle: {
        fontSize: 13.5,
        fontWeight: "600",
        color: "#222222",
        marginBottom: 3,
    },

    settingDescription: {
        fontSize: 11.5,
        lineHeight: 16,
        color: "#929298",
    },

    dangerText: {
        color: "#B84E4E",
    },

    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#EEEEEE",
        marginLeft: 68,
    },

    pressedRow: {
        backgroundColor: "#F8F8F8",
    },

    footer: {
        textAlign: "center",
        color: "#B2B2B6",
        fontSize: 11,
        marginTop: 25,
    },
});