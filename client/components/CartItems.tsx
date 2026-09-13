import React from "react";
import {
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CartItemProps } from "@/constants/types";
import { COLORS } from "@/constants";

type Props = CartItemProps & {
    maxQuantity?: number;
};

export default function CartItems({
    item,
    onRemove,
    onUpdateQuantity,
    maxQuantity,
}: Props) {
    const imageUrl =
        item.product.images?.[0] ??
        "https://via.placeholder.com/300x300.png?text=No+Image";

    const canDecrease = item.quantity > 1;

    const canIncrease =
        maxQuantity === undefined ||
        item.quantity < maxQuantity;

    const handleDecrease = () => {
        if (!onUpdateQuantity || !canDecrease) return;

        onUpdateQuantity(item.quantity - 1);
    };

    const handleIncrease = () => {
        if (!onUpdateQuantity || !canIncrease) return;

        onUpdateQuantity(item.quantity + 1);
    };

    return (
        <View className="mb-4 rounded-2xl bg-white p-3 shadow-sm">
            <View className="flex-row">
                {/* ===================================== */}
                {/* PRODUCT IMAGE */}
                {/* ===================================== */}

                <View className="h-[105px] w-[90px] overflow-hidden rounded-xl bg-gray-100">
                    <Image
                        source={{ uri: imageUrl }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                </View>

                {/* ===================================== */}
                {/* PRODUCT INFO */}
                {/* ===================================== */}

                <View className="ml-3 flex-1">
                    {/* TITLE + REMOVE */}
                    <View className="flex-row items-start">
                        <View className="flex-1 pr-2">
                            <Text
                                className="text-sm font-bold leading-5 text-primary"
                                numberOfLines={2}
                            >
                                {item.product.name}
                            </Text>

                            {/* SIZE */}
                            <View className="mt-2 flex-row items-center">
                                <View className="rounded-md bg-gray-100 px-2 py-1">
                                    <Text className="text-[11px] font-semibold text-secondary">
                                        Size: {item.size}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* REMOVE */}
                        {onRemove && (
                            <TouchableOpacity
                                onPress={onRemove}
                                hitSlop={{
                                    top: 10,
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={19}
                                    color={COLORS.accent}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ================================= */}
                    {/* PRICE + QUANTITY */}
                    {/* ================================= */}

                    <View className="mt-4 flex-row items-center justify-between">
                        {/* PRICE */}
                        <Text className="text-base font-bold text-primary">
                            ${item.product.price.toFixed(2)}
                        </Text>

                        {/* QUANTITY CONTROL */}
                        <View className="flex-row items-center rounded-full bg-surface px-2 py-1.5">
                            {/* MINUS */}
                            <TouchableOpacity
                                onPress={handleDecrease}
                                disabled={!canDecrease}
                                activeOpacity={0.7}
                                className="h-7 w-7 items-center justify-center rounded-full"
                                style={{
                                    opacity: canDecrease
                                        ? 1
                                        : 0.35,
                                }}
                            >
                                <Ionicons
                                    name="remove"
                                    size={16}
                                    color={COLORS.primary}
                                />
                            </TouchableOpacity>

                            {/* NUMBER */}
                            <Text className="mx-3 min-w-[18px] text-center text-sm font-bold text-primary">
                                {item.quantity}
                            </Text>

                            {/* PLUS */}
                            <TouchableOpacity
                                onPress={handleIncrease}
                                disabled={!canIncrease}
                                activeOpacity={0.7}
                                className="h-7 w-7 items-center justify-center rounded-full"
                                style={{
                                    opacity: canIncrease
                                        ? 1
                                        : 0.35,
                                }}
                            >
                                <Ionicons
                                    name="add"
                                    size={16}
                                    color={COLORS.primary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* ========================================= */}
            {/* STOCK MESSAGE */}
            {/* ========================================= */}

            {maxQuantity !== undefined &&
                maxQuantity > 0 &&
                item.quantity >= maxQuantity && (
                    <View className="mt-3 flex-row items-center rounded-xl bg-orange-50 px-3 py-2">
                        <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color="#F59E0B"
                        />

                        <Text className="ml-2 text-xs font-medium text-orange-700">
                            Maximum available quantity reached
                        </Text>
                    </View>
                )}
        </View>
    );
}
