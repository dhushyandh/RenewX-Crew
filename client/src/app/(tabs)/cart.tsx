import React, { useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useCart } from "../../../context/CartContext";
import Header from "../../../components/Header";
import CartItems from "../../../components/CartItems";
import { COLORS } from "@/constants";

export default function Cart() {
    const {
        cartItems,
        removeFromCart,
        clearCart,
        updateQuantity,
        isLoading,
    } = useCart();

    const router = useRouter();

    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => {
            return total + item.product.price * item.quantity;
        }, 0);
    }, [cartItems]);

    const totalItems = useMemo(() => {
        return cartItems.reduce((total, item) => {
            return total + item.quantity;
        }, 0);
    }, [cartItems]);

    const handleClearCart = () => {
        Alert.alert(
            "Clear Cart",
            "Are you sure you want to remove all items from your cart?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Clear Cart",
                    style: "destructive",
                    onPress: async () => {
                        await clearCart();
                    },
                },
            ]
        );
    };

    const handleRemoveItem = (
        productId: string,
        size: string,
        productName: string
    ) => {
        Alert.alert(
            "Remove Item",
            `Remove "${productName}" from your cart?`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        await removeFromCart(productId, size);
                    },
                },
            ]
        );
    };

    if (isLoading && cartItems.length === 0) {
        return (
            <SafeAreaView
                className="flex-1 bg-surface"
                edges={["top"]}
            >
                <Header title="Cart" showBack />

                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator
                        size="large"
                        color={COLORS.primary}
                    />

                    <Text className="mt-3 text-sm text-secondary">
                        Loading your cart...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (cartItems.length === 0) {
        return (
            <SafeAreaView
                className="flex-1 bg-surface"
                edges={["top"]}
            >
                <Header title="Cart" showBack />

                <View className="flex-1 items-center justify-center px-6">
                    <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                        <Ionicons
                            name="bag-outline"
                            size={42}
                            color={COLORS.primary}
                        />
                    </View>

                    <Text className="mt-6 text-2xl font-bold text-primary">
                        Your Cart Is Empty
                    </Text>

                    <Text className="mt-2 max-w-[290px] text-center text-sm leading-5 text-secondary">
                        Looks like you haven't added anything to
                        your cart yet. Discover something you love
                        and add it here.
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
                            Start Shopping
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
            <Header title="Cart" showBack />

            <View className="flex-row items-center justify-between px-4 pb-2 pt-5">
                <View>
                    <Text className="text-xl font-bold text-primary">
                        Your Cart
                    </Text>

                    <Text className="mt-1 text-sm text-secondary">
                        {totalItems}{" "}
                        {totalItems === 1 ? "item" : "items"}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={handleClearCart}
                    disabled={isLoading}
                    activeOpacity={0.7}
                >
                    <Text
                        className="text-sm font-semibold"
                        style={{
                            color: COLORS.accent,
                        }}
                    >
                        Clear All
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: 12,
                    paddingBottom: 25,
                }}
            >
                {cartItems.map((item) => {
                    return (
                        <CartItems
                            key={`${item.productId}-${item.size}`}
                            item={{
                                id: item.id,
                                product: {
                                    name: item.product.name,
                                    price: item.product.price,
                                    images: item.product.images,
                                },
                                quantity: item.quantity,
                                size: item.size,
                            }}
                            maxQuantity={item.product.stock}
                            onRemove={() => {
                                handleRemoveItem(
                                    item.productId,
                                    item.size,
                                    item.product.name
                                );
                            }}
                            onUpdateQuantity={(quantity) => {
                                updateQuantity(
                                    item.productId,
                                    item.size,
                                    quantity
                                );
                            }}
                        />
                    );
                })}

                <View className="mt-1 flex-row items-center rounded-2xl bg-white px-4 py-4">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Ionicons
                            name="cube-outline"
                            size={20}
                            color={COLORS.primary}
                        />
                    </View>

                    <View className="ml-3 flex-1">
                        <Text className="text-sm font-bold text-primary">
                            Secure shopping
                        </Text>

                        <Text className="mt-0.5 text-xs text-secondary">
                            Your items are safely reserved in your
                            cart.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <View className="rounded-t-[30px] bg-white px-5 pb-5 pt-5 shadow-sm">
                <Text className="mb-4 text-lg font-bold text-primary">
                    Order Summary
                </Text>

                <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-sm text-secondary">
                        Subtotal
                    </Text>

                    <Text className="text-sm font-semibold text-primary">
                        ₹₹${subtotal.toFixed(2)}
                    </Text>
                </View>

                <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-sm text-secondary">
                        Shipping
                    </Text>

                    <Text className="text-sm font-semibold text-green-600">
                        Calculated at checkout
                    </Text>
                </View>

                <View className="my-2 h-px bg-gray-100" />

                <View className="mb-5 flex-row items-center justify-between">
                    <Text className="text-base font-bold text-primary">
                        Total
                    </Text>

                    <Text
                        className="text-xl font-bold"
                        style={{
                            color: COLORS.primary,
                        }}
                    >
                        ${subtotal.toFixed(2)}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => router.push("/checkout")}
                    disabled={isLoading}
                    activeOpacity={0.85}
                    className="h-14 flex-row items-center justify-center rounded-2xl"
                    style={{
                        backgroundColor: COLORS.primary,
                        opacity: isLoading ? 0.6 : 1,
                    }}
                >
                    <Text className="text-base font-bold text-white">
                        Proceed to Checkout
                    </Text>

                    <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#FFFFFF"
                        style={{
                            marginLeft: 8,
                        }}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}