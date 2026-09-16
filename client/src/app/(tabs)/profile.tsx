import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";
import { COLORS } from "@/constants";

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

    const fullName = user
        ? user.fullName ||
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.username ||
          "RenewX User"
        : "Guest User";

    const email = user?.primaryEmailAddress?.emailAddress ?? "";

    const initials = user
        ? (
              (user.firstName?.[0] || "") + (user.lastName?.[0] || "")
          ).toUpperCase() ||
          fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() ||
          "U"
        : "G";

    const isAdmin =
        user?.publicMetadata?.role === "admin" ||
        email === "dhushyandhneduncheziyan4896@gmail.com";

    const handleSignOut = () => {
        if (isSigningOut) return;

        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out of your account?",
            [
                { text: "Cancel", style: "cancel" },
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
    };

    if (!isLoaded) {
        return (
            <SafeAreaView className="flex-1 bg-[#F7F7F7] items-center justify-center" edges={["top"]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#F7F7F7]" edges={["top"]}>
            {/* Top Bar Header */}
            <View className="h-14 bg-white border-b border-gray-100 items-center justify-center">
                <Text className="text-lg font-bold text-gray-900">Profile</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="w-full max-w-lg self-center px-4 pt-5">
                    {!isSignedIn ? (
                        <>
                            {/* GUEST WELCOME HERO */}
                            <View className="items-center pt-2 pb-6">
                                <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-4">
                                    <Ionicons name="person-outline" size={44} color="#4D4D54" />
                                </View>

                                <Text className="text-2xl font-bold text-gray-900 text-center">
                                    Welcome to RenewX
                                </Text>

                                <Text className="text-sm text-gray-500 text-center mt-2 px-6">
                                    Sign in to access your account, orders, favorites and more.
                                </Text>

                                <View className="w-full mt-6 space-y-3">
                                    <TouchableOpacity
                                        onPress={() => router.push("/sign-in" as never)}
                                        activeOpacity={0.85}
                                        className="w-full h-13 py-3.5 px-6 rounded-2xl bg-black flex-row items-center justify-center shadow-sm"
                                    >
                                        <Text className="text-white font-bold text-base mr-2">
                                            Sign In
                                        </Text>
                                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => router.push("/sign-up" as never)}
                                        activeOpacity={0.85}
                                        className="w-full h-13 py-3.5 px-6 rounded-2xl bg-white border border-gray-900 items-center justify-center mt-3"
                                    >
                                        <Text className="text-gray-900 font-bold text-base">
                                            Create Account
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* EXPLORE SECTION */}
                            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                                Explore RenewX
                            </Text>

                            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <TouchableOpacity
                                    onPress={() => router.push("/favorites" as never)}
                                    activeOpacity={0.7}
                                    className="flex-row items-center px-4 py-3.5"
                                >
                                    <View className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center mr-3">
                                        <Ionicons name="heart-outline" size={22} color="#111111" />
                                    </View>
                                    <View className="flex-1 mr-2">
                                        <Text className="text-[15px] font-bold text-gray-900">
                                            Favorites
                                        </Text>
                                        <Text className="text-xs text-gray-500 mt-0.5">
                                            View your saved products
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* LOGGED IN USER PROFILE HERO */}
                            <View className="items-center pt-2 pb-6">
                                {user?.imageUrl ? (
                                    <Image
                                        source={{ uri: user.imageUrl }}
                                        className="w-24 h-24 rounded-full bg-gray-200 mb-3"
                                    />
                                ) : (
                                    <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-3">
                                        <Text className="text-2xl font-bold text-gray-700">
                                            {initials}
                                        </Text>
                                    </View>
                                )}

                                <Text className="text-xl font-bold text-gray-900 text-center" numberOfLines={1}>
                                    {fullName}
                                </Text>

                                {email ? (
                                    <Text className="text-xs text-gray-500 text-center mt-1" numberOfLines={1}>
                                        {email}
                                    </Text>
                                ) : null}

                                {isAdmin && (
                                    <TouchableOpacity
                                        onPress={() => router.push("/admin" as never)}
                                        activeOpacity={0.85}
                                        className="mt-3 px-4 py-2 bg-gray-900 rounded-full flex-row items-center"
                                    >
                                        <Ionicons name="shield-checkmark-outline" size={16} color="#FFFFFF" />
                                        <Text className="text-white text-xs font-bold mx-2">
                                            Admin Panel
                                        </Text>
                                        <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* ACCOUNT MENU SECTION */}
                            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                                Account
                            </Text>

                            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                {MENU_ITEMS.map((item, index) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => router.push(item.route as never)}
                                        activeOpacity={0.7}
                                        className={`flex-row items-center px-4 py-3.5 ${
                                            index < MENU_ITEMS.length - 1 ? "border-b border-gray-100" : ""
                                        }`}
                                    >
                                        <View className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center mr-3">
                                            <Ionicons name={item.icon} size={20} color="#111111" />
                                        </View>
                                        <View className="flex-1 mr-2">
                                            <Text className="text-[15px] font-bold text-gray-900">
                                                {item.title}
                                            </Text>
                                            <Text className="text-xs text-gray-500 mt-0.5">
                                                {item.subtitle}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* SIGN OUT BUTTON */}
                            <TouchableOpacity
                                onPress={handleSignOut}
                                disabled={isSigningOut}
                                activeOpacity={0.8}
                                className="w-full h-13 py-3.5 px-4 rounded-2xl bg-red-50 border border-red-100 flex-row items-center justify-center mt-4"
                            >
                                {isSigningOut ? (
                                    <ActivityIndicator size="small" color="#DC2626" />
                                ) : (
                                    <>
                                        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                                        <Text className="text-red-600 font-bold text-sm ml-2">
                                            Sign Out
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    <Text className="text-center text-xs text-gray-400 mt-8 mb-4">
                        RenewX
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}