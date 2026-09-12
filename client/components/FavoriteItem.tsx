import React from "react";
import {
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

import { Product } from "@/constants/types";
import { COLORS } from "@/constants";
import { useWishList } from "../context/WishListContext";

type FavoriteItemProps = {
    product: Product;
};

export default function FavoriteItem({
    product,
}: FavoriteItemProps) {
    const { toggleWishlist } = useWishList();

    const discount =
        product.comparePrice &&
        product.comparePrice > product.price
            ? Math.round(
                  ((product.comparePrice - product.price) /
                      product.comparePrice) *
                      100
              )
            : 0;

    const category =
        typeof product.category === "string"
            ? product.category
            : product.category?.name ?? "Product";

    const handleRemove = () => {
        toggleWishlist(product);
    };

    return (
        <Link
            href={{
                pathname: "/product/[id]" as any,
                params: {
                    id: product._id,
                },
            }}
            asChild
        >
            <TouchableOpacity
                activeOpacity={0.9}
                className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white"
            >
                <View className="flex-row p-3">
                    {/* Product Image */}
                    <View className="relative h-32 w-28 overflow-hidden rounded-xl bg-gray-100">
                        {product.images &&
                        product.images.length > 0 ? (
                            <Image
                                source={{
                                    uri: product.images[0],
                                }}
                                className="h-full w-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="h-full w-full items-center justify-center">
                                <Ionicons
                                    name="image-outline"
                                    size={32}
                                    color={COLORS.secondary}
                                />
                            </View>
                        )}

                        {/* Discount */}
                        {discount > 0 && (
                            <View className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-1">
                                <Text className="text-[10px] font-bold text-white">
                                    -{discount}%
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Product Information */}
                    <View className="ml-3 flex-1 justify-between py-0.5">
                        {/* Top Row */}
                        <View className="flex-row items-start justify-between">
                            <View className="mr-2 flex-1">
                                <Text className="text-[11px] font-medium uppercase tracking-wider text-secondary">
                                    {category}
                                </Text>

                                <Text
                                    className="mt-1 text-sm font-bold leading-5 text-primary"
                                    numberOfLines={2}
                                >
                                    {product.name}
                                </Text>
                            </View>

                            {/* Remove Wishlist */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={(event) => {
                                    event.stopPropagation();
                                    handleRemove();
                                }}
                                className="h-9 w-9 items-center justify-center rounded-full bg-gray-50"
                            >
                                <Ionicons
                                    name="heart"
                                    size={19}
                                    color={COLORS.accent}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Rating */}
                        <View className="mt-2 flex-row items-center">
                            <Ionicons
                                name="star"
                                size={13}
                                color="#FBBF24"
                            />

                            <Text className="ml-1 text-xs font-semibold text-primary">
                                {product.ratings?.average?.toFixed(1) ??
                                    "0.0"}
                            </Text>

                            <Text className="ml-1 text-xs text-secondary">
                                ({product.ratings?.count ?? 0})
                            </Text>
                        </View>

                        {/* Bottom Row */}
                        <View className="mt-2 flex-row items-center justify-between">
                            <View className="flex-row items-baseline">
                                <Text className="text-base font-bold text-primary">
                                    ${product.price.toFixed(2)}
                                </Text>

                                {product.comparePrice &&
                                    product.comparePrice >
                                        product.price && (
                                        <Text className="ml-2 text-xs text-secondary line-through">
                                            $
                                            {product.comparePrice.toFixed(
                                                2
                                            )}
                                        </Text>
                                    )}
                            </View>

                            {/* Stock */}
                            {product.stock > 0 ? (
                                <View className="flex-row items-center">
                                    <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />

                                    <Text className="text-[10px] font-medium text-green-600">
                                        In Stock
                                    </Text>
                                </View>
                            ) : (
                                <Text className="text-[10px] font-semibold text-red-500">
                                    Out of Stock
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}