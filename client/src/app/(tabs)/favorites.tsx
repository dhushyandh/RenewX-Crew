import React from "react";
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

import Header from "../../../components/Header";
import FavoriteItem from "../../../components/FavoriteItem";
import { useWishList } from "../../../context/WishListContext";
import { COLORS } from "@/constants";

export default function Favorites() {
    const { wishlist, loading } = useWishList();
    const router = useRouter();

    if (loading && wishlist.length === 0) {
        return (
            <SafeAreaView
                className="flex-1 bg-surface"
                edges={["top"]}
            >
                <Header
                    title="Favorites"
                    showLogo
                    showCart
                />

                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator
                        size="large"
                        color={COLORS.primary}
                    />

                    <Text className="mt-3 text-sm text-secondary">
                        Loading your favorites...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (wishlist.length === 0) {
        return (
            <SafeAreaView
                className="flex-1 bg-surface"
                edges={["top"]}
            >
                <Header
                    title="Favorites"
                    showLogo
                    showCart
                />

                <View className="flex-1 items-center justify-center px-6">
                    {/* Heart Icon */}
                    <View className="h-24 w-24 items-center justify-center rounded-full bg-red-50">
                        <Ionicons
                            name="heart-outline"
                            size={44}
                            color={COLORS.accent}
                        />
                    </View>

                    <Text className="mt-6 text-2xl font-bold text-primary">
                        No Favorites Yet
                    </Text>

                    <Text className="mt-2 max-w-[300px] text-center text-sm leading-5 text-secondary">
                        Save products you love by tapping the
                        heart icon. Your favorite items will appear
                        here.
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.push("/")}
                        activeOpacity={0.85}
                        className="mt-7 h-12 flex-row items-center justify-center rounded-full px-7"
                        style={{
                            backgroundColor: COLORS.primary,
                        }}
                    >
                        <Ionicons
                            name="bag-handle-outline"
                            size={19}
                            color="#FFFFFF"
                        />

                        <Text className="ml-2 font-bold text-white">
                            Explore Products
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            className="flex-1 bg-surface"
            edges={["top"]}
        >
            <Header
                title="Favorites"
                showLogo
                showCart
            />

            {/* Favorites Header */}
            <View className="px-4 pb-3 pt-5">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-2xl font-bold text-primary">
                            Your Favorites
                        </Text>

                        <Text className="mt-1 text-sm text-secondary">
                            {wishlist.length}{" "}
                            {wishlist.length === 1
                                ? "item"
                                : "items"}{" "}
                            saved
                        </Text>
                    </View>

                    <View className="h-11 w-11 items-center justify-center rounded-full bg-red-50">
                        <Ionicons
                            name="heart"
                            size={21}
                            color={COLORS.accent}
                        />
                    </View>
                </View>
            </View>

            {/* Favorites List */}
            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: 8,
                    paddingBottom: 30,
                }}
            >
                {wishlist.map((product, index) => (
                    <FavoriteItem
                        key={product._id ? `${product._id}-${index}` : String(index)}
                        product={product}
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}