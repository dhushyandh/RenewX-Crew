import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";

const COLORS = {
    background: "#F7F7F7",
    white: "#FFFFFF",
    black: "#111111",
    text: "#181818",
    secondary: "#707070",
    muted: "#969696",
    border: "#E8E8E8",
    iconBackground: "#F1F1F3",
    danger: "#B84E4E",
};

type MenuItem = {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
};

const MENU_ITEMS: MenuItem[] = [
    {
        id: "orders",
        title: "My Orders",
        subtitle: "Track and manage your orders",
        icon: "receipt-outline",
        route: "/orders",
    },
    {
        id: "favorites",
        title: "Favorites",
        subtitle: "Your saved products",
        icon: "heart-outline",
        route: "/favorites",
    },
    {
        id: "addresses",
        title: "Shipping Addresses",
        subtitle: "Manage your delivery addresses",
        icon: "location-outline",
        route: "/addresses",
    },
    {
        id: "reviews",
        title: "My Reviews",
        subtitle: "Products you have reviewed",
        icon: "star-outline",
        route: "/reviews",
    },
    {
        id: "settings",
        title: "Settings",
        subtitle: "Account and app preferences",
        icon: "settings-outline",
        route: "/settings",
    },
];

export default function Profile() {
    const router = useRouter();
    const clerk = useClerk();
    const { isLoaded, isSignedIn, user } = useUser();

    const [isSigningOut, setIsSigningOut] = useState(false);

    const fullName = useMemo(() => {
        if (!user) {
            return "Guest User";
        }

        return (
            user.fullName ||
            [user.firstName, user.lastName]
                .filter(Boolean)
                .join(" ") ||
            user.username ||
            "RenewX User"
        );
    }, [user]);

    const email = user?.primaryEmailAddress?.emailAddress ?? "";

    const initials = useMemo(() => {
        if (!user) {
            return "G";
        }

        const first = user.firstName?.[0] ?? "";
        const last = user.lastName?.[0] ?? "";

        const result = `${first}${last}`.toUpperCase();

        if (result) {
            return result;
        }

        return fullName
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }, [user, fullName]);

    const isAdmin = useMemo(() => {
        const role = user?.publicMetadata?.role;

        return (
            typeof role === "string" &&
            role.trim().toLowerCase() === "admin"
        );
    }, [user]);

    const navigate = useCallback(
        (route: string) => {
            router.push(route as never);
        },
        [router]
    );

    const handleSignOut = useCallback(() => {
        if (isSigningOut) {
            return;
        }

        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out of your account?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        setIsSigningOut(true);

                        try {
                            await clerk.signOut();
                        } catch (error) {
                            console.error("Sign out failed:", error);

                            Alert.alert(
                                "Sign Out Failed",
                                "We couldn't sign you out. Please try again."
                            );
                        } finally {
                            setIsSigningOut(false);
                        }
                    },
                },
            ]
        );
    }, [clerk, isSigningOut]);

    if (!isLoaded) {
        return (
            <SafeAreaView style={styles.safeArea} edges={["top"]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.black} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.screen}>
                {/* =====================================================
                    HEADER
                ====================================================== */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces
                >
                    <View style={styles.content}>
                        {!isSignedIn ? (
                            <>
                                {/* =================================================
                                    GUEST PROFILE
                                ================================================== */}
                                <View style={styles.guestHero}>
                                    <View style={styles.guestAvatar}>
                                        <Ionicons
                                            name="person-outline"
                                            size={44}
                                            color="#4D4D54"
                                        />
                                    </View>

                                    <Text style={styles.guestTitle}>
                                        Welcome to RenewX
                                    </Text>

                                    <Text style={styles.guestSubtitle}>
                                        Sign in to access your account, orders,
                                        favorites and more.
                                    </Text>

                                    <View style={styles.authButtons}>
                                        <Pressable
                                            onPress={() => navigate("/sign-in")}
                                            style={({ pressed }) => [
                                                styles.signInButton,
                                                pressed && styles.signInPressed,
                                            ]}
                                        >
                                            <Text style={styles.signInButtonText}>
                                                Sign In
                                            </Text>

                                            <Ionicons
                                                name="arrow-forward"
                                                size={19}
                                                color="#FFFFFF"
                                            />
                                        </Pressable>

                                        <Pressable
                                            onPress={() => navigate("/sign-up")}
                                            style={({ pressed }) => [
                                                styles.createAccountButton,
                                                pressed && styles.createAccountPressed,
                                            ]}
                                        >
                                            <Text style={styles.createAccountText}>
                                                Create Account
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>

                                {/* =================================================
                                    EXPLORE
                                ================================================== */}
                                <Text style={styles.sectionLabel}>
                                    EXPLORE RENEWX
                                </Text>

                                <View style={styles.menuCard}>
                                    <ProfileMenuRow
                                        title="Favorites"
                                        subtitle="View your saved products"
                                        icon="heart-outline"
                                        onPress={() => navigate("/favorites")}
                                    />
                                </View>
                            </>
                        ) : (
                            <>
                                {/* =================================================
                                    PROFILE HERO
                                ================================================== */}
                                <View style={styles.profileHero}>
                                    {user?.imageUrl ? (
                                        <Image
                                            source={{ uri: user.imageUrl }}
                                            style={styles.profileImage}
                                        />
                                    ) : (
                                        <View style={styles.profileAvatar}>
                                            <Text style={styles.initials}>
                                                {initials}
                                            </Text>
                                        </View>
                                    )}

                                    <Text
                                        style={styles.userName}
                                        numberOfLines={1}
                                    >
                                        {fullName}
                                    </Text>

                                    {email ? (
                                        <Text
                                            style={styles.userEmail}
                                            numberOfLines={1}
                                        >
                                            {email}
                                        </Text>
                                    ) : null}

                                    {isAdmin && (
                                        <Pressable
                                            onPress={() => navigate("/admin")}
                                            style={({ pressed }) => [
                                                styles.adminButton,
                                                pressed && styles.buttonPressed,
                                            ]}
                                        >
                                            <Ionicons
                                                name="shield-checkmark-outline"
                                                size={17}
                                                color="#FFFFFF"
                                            />

                                            <Text style={styles.adminText}>
                                                Admin Panel
                                            </Text>

                                            <Ionicons
                                                name="arrow-forward"
                                                size={14}
                                                color="#FFFFFF"
                                            />
                                        </Pressable>
                                    )}
                                </View>

                                {/* =================================================
                                    ACCOUNT
                                ================================================== */}
                                <Text style={styles.sectionLabel}>
                                    ACCOUNT
                                </Text>

                                <View style={styles.menuCard}>
                                    {MENU_ITEMS.map((item, index) => (
                                        <ProfileMenuRow
                                            key={item.id}
                                            title={item.title}
                                            subtitle={item.subtitle}
                                            icon={item.icon}
                                            onPress={() => navigate(item.route)}
                                            showDivider={
                                                index < MENU_ITEMS.length - 1
                                            }
                                        />
                                    ))}
                                </View>

                                {/* =================================================
                                    SIGN OUT
                                ================================================== */}
                                <Pressable
                                    onPress={handleSignOut}
                                    disabled={isSigningOut}
                                    style={({ pressed }) => [
                                        styles.logoutButton,
                                        pressed &&
                                            !isSigningOut &&
                                            styles.logoutPressed,
                                    ]}
                                >
                                    {isSigningOut ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={COLORS.danger}
                                        />
                                    ) : (
                                        <>
                                            <Ionicons
                                                name="log-out-outline"
                                                size={20}
                                                color={COLORS.danger}
                                            />

                                            <Text style={styles.logoutText}>
                                                Sign Out
                                            </Text>
                                        </>
                                    )}
                                </Pressable>
                            </>
                        )}

                        <Text style={styles.footer}>RenewX</Text>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

/* ================================================================
   PROFILE MENU ROW
================================================================ */

function ProfileMenuRow({
    title,
    subtitle,
    icon,
    onPress,
    showDivider = false,
}: {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    showDivider?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.menuRow,
                showDivider && styles.menuRowDivider,
                pressed && styles.menuRowPressed,
            ]}
        >
            {/* ICON */}
            <View style={styles.menuIconWrapper}>
                <View style={styles.menuIconBox}>
                    <Ionicons name={icon} size={21} color={COLORS.black} />
                </View>
            </View>

            {/* TEXT */}
            <View style={styles.menuTextWrapper}>
                <Text style={styles.menuTitle} numberOfLines={1}>
                    {title}
                </Text>

                <Text style={styles.menuSubtitle} numberOfLines={1}>
                    {subtitle}
                </Text>
            </View>

            {/* CHEVRON */}
            <View style={styles.menuChevron}>
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#A0A0A0"
                />
            </View>
        </Pressable>
    );
}

/* ================================================================
   STYLES
================================================================ */

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    screen: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.background,
    },

    /* ============================================================
       HEADER
    ============================================================ */

    header: {
        height: 58,
        backgroundColor: COLORS.white,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },

    /* ============================================================
       SCROLL
    ============================================================ */

    scroll: {
        flex: 1,
    },

    scrollContent: {
        flexGrow: 1,
        paddingBottom: 110,
    },

    content: {
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
        paddingHorizontal: 18,
        paddingTop: 22,
    },

    /* ============================================================
       GUEST
    ============================================================ */

    guestHero: {
        width: "100%",
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 32,
    },

    guestAvatar: {
        width: 104,
        height: 104,
        borderRadius: 52,
        backgroundColor: "#EDEDEF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },

    guestTitle: {
        fontSize: 25,
        lineHeight: 32,
        fontWeight: "700",
        color: COLORS.text,
        textAlign: "center",
    },

    guestSubtitle: {
        width: "100%",
        maxWidth: 390,
        marginTop: 9,
        fontSize: 14,
        lineHeight: 21,
        color: COLORS.secondary,
        textAlign: "center",
    },

    /* ============================================================
       AUTH
    ============================================================ */

    authButtons: {
        width: "100%",
        maxWidth: 390,
        marginTop: 25,
    },

    signInButton: {
        width: "100%",
        height: 54,
        borderRadius: 15,
        backgroundColor: COLORS.black,
        borderWidth: 1,
        borderColor: COLORS.black,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        gap: 9,

        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },

    signInButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },

    signInPressed: {
        backgroundColor: "#303030",
    },

    createAccountButton: {
        width: "100%",
        height: 54,
        marginTop: 11,
        borderRadius: 15,

        backgroundColor: "#FFFFFF",

        borderWidth: 1.5,
        borderColor: COLORS.black,

        alignItems: "center",
        justifyContent: "center",
    },

    createAccountText: {
        color: COLORS.black,
        fontSize: 15,
        fontWeight: "700",
    },

    createAccountPressed: {
        backgroundColor: "#F0F0F0",
    },

    /* ============================================================
       SECTION
    ============================================================ */

    sectionLabel: {
        marginBottom: 9,
        paddingHorizontal: 2,

        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.8,

        color: "#777777",
    },

    /* ============================================================
       MENU CARD
    ============================================================ */

    menuCard: {
        width: "100%",
        backgroundColor: COLORS.white,

        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,

        overflow: "hidden",
    },

    /* ============================================================
       MENU ROW
    ============================================================ */

    menuRow: {
        width: "100%",
        minHeight: 78,

        paddingLeft: 14,
        paddingRight: 12,
        paddingVertical: 10,

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: COLORS.white,
    },

    menuRowDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border,
    },

    menuRowPressed: {
        backgroundColor: "#F8F8F8",
    },

    /* ============================================================
       MENU ICON
    ============================================================ */

    menuIconWrapper: {
        width: 50,
        height: 50,

        flexShrink: 0,

        alignItems: "center",
        justifyContent: "center",
    },

    menuIconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,

        backgroundColor: COLORS.iconBackground,

        alignItems: "center",
        justifyContent: "center",
    },

    /* ============================================================
       MENU TEXT
    ============================================================ */

    menuTextWrapper: {
        flex: 1,

        minWidth: 0,

        marginLeft: 13,
        marginRight: 8,

        justifyContent: "center",
    },

    menuTitle: {
        width: "100%",

        fontSize: 15,
        lineHeight: 20,
        fontWeight: "700",

        color: COLORS.text,
    },

    menuSubtitle: {
        width: "100%",

        marginTop: 4,

        fontSize: 12,
        lineHeight: 17,

        color: "#929298",
    },

    /* ============================================================
       CHEVRON
    ============================================================ */

    menuChevron: {
        width: 28,
        height: 50,

        flexShrink: 0,

        alignItems: "center",
        justifyContent: "center",
    },

    /* ============================================================
       SIGNED-IN PROFILE
    ============================================================ */

    profileHero: {
        width: "100%",

        alignItems: "center",

        paddingTop: 4,
        paddingBottom: 22,
    },

    profileImage: {
        width: 94,
        height: 94,
        borderRadius: 47,

        backgroundColor: COLORS.iconBackground,

        marginBottom: 14,
    },

    profileAvatar: {
        width: 94,
        height: 94,
        borderRadius: 47,

        backgroundColor: "#E8E8EC",

        alignItems: "center",
        justifyContent: "center",

        marginBottom: 14,
    },

    initials: {
        fontSize: 30,
        fontWeight: "700",
        color: "#45454C",
    },

    userName: {
        maxWidth: "92%",

        fontSize: 22,
        lineHeight: 28,

        fontWeight: "700",

        color: COLORS.text,

        textAlign: "center",
    },

    userEmail: {
        maxWidth: "92%",

        marginTop: 5,

        fontSize: 13,
        lineHeight: 18,

        color: "#85858B",

        textAlign: "center",
    },

    /* ============================================================
       ADMIN
    ============================================================ */

    adminButton: {
        minHeight: 40,

        marginTop: 13,
        paddingHorizontal: 17,

        borderRadius: 20,

        backgroundColor: COLORS.black,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        gap: 7,
    },

    adminText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: "700",
    },

    /* ============================================================
       LOGOUT
    ============================================================ */

    logoutButton: {
        width: "100%",
        height: 52,

        marginTop: 16,

        borderRadius: 15,

        backgroundColor: "#FFF7F7",

        borderWidth: 1,
        borderColor: "#F2DEDE",

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        gap: 8,
    },

    logoutText: {
        color: COLORS.danger,
        fontSize: 14,
        fontWeight: "700",
    },

    logoutPressed: {
        opacity: 0.7,
    },

    buttonPressed: {
        opacity: 0.82,
        transform: [
            {
                scale: 0.99,
            },
        ],
    },

    /* ============================================================
       FOOTER
    ============================================================ */

    footer: {
        marginTop: 27,

        textAlign: "center",

        color: "#B0B0B4",

        fontSize: 11,
    },
});