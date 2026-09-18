import React, { useEffect, useMemo, useState } from "react";
import {
    Platform,
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Product } from "@/constants/types";
import { COLORS } from "@/constants";
import { dummyProducts } from "@/assets/assets";
import { useCart } from "../../../context/CartContext";
import { useWishList } from "../../../context/WishListContext";
import Toast from "react-native-toast-message";
import api from "@/constants/api";

const { width } = Dimensions.get("window");

export default function ProductDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const { addToCart, itemCount } = useCart();
    const { toggleWishlist, isInWishlist } = useWishList();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState("");
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchProductDetails = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/products/${id}`);
                if (isMounted && data.success && data.data) {
                    setProduct(data.data);
                    setSelectedSize(data.data.sizes?.[0] || "");
                    setActiveImageIndex(0);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.log("Could not fetch product from backend, checking dummy fallback:", err);
            }

            const foundProduct =
                dummyProducts.find((item) => item._id === id) ?? null;

            if (isMounted) {
                setProduct(foundProduct as Product | null);
                setSelectedSize(foundProduct?.sizes?.[0] || "");
                setActiveImageIndex(0);
                setLoading(false);
            }
        };

        if (id) {
            fetchProductDetails();
        }

        return () => {
            isMounted = false;
        };
    }, [id]);

    const isLiked = product ? isInWishlist(product._id) : false;

    const availableSizes = useMemo(() => {
        if (product?.sizes && product.sizes.length > 0) {
            return product.sizes;
        }
        return ["S", "M", "L", "XL", "XXL"];
    }, [product]);

    const handleAddToCart = async () => {
        if (!product || addingToCart) return;

        if (!selectedSize) {
            Toast.show({
                type: "info",
                text1: "No Size selected",
                text2: "Please select a size before adding to cart",
                position: "top",
                visibilityTime: 3000,
            });
            return;
        }

        try {
            setAddingToCart(true);
            await addToCart(product, selectedSize);
            Toast.show({
                type: "success",
                text1: "Added to Cart",
                text2: `${product.name} (${selectedSize}) added to cart`,
                position: "top",
                visibilityTime: 2500,
            });
        } catch (error) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Could not add to cart. Please try again.",
                position: "top",
            });
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
                <Ionicons
                    name="search-outline"
                    size={64}
                    color={COLORS.primary}
                />

                <Text className="mt-4 text-center text-2xl font-bold text-gray-900">
                    Product not found
                </Text>

                <Text className="mt-2 text-center text-gray-500">
                    The product you're looking for is no longer available.
                </Text>

                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.85}
                    className="mt-6 rounded-full px-7 py-3"
                    style={{ backgroundColor: COLORS.primary }}
                >
                    <Text className="font-semibold text-white">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const images =
        product.images && product.images.length > 0
            ? product.images
            : ["https://via.placeholder.com/1000x1000.png?text=No+Image"];

    return (
        <View className="flex-1 bg-white">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110 }}
            >
                {/* IMAGE GALLERY */}
                <View
                    className="relative w-full overflow-hidden bg-[#f4f4f4]"
                    style={{ height: Math.round(width * 1.05) }}
                >
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        decelerationRate="fast"
                        onScroll={(event) => {
                            const slide = Math.round(
                                event.nativeEvent.contentOffset.x /
                                event.nativeEvent.layoutMeasurement.width
                            );

                            if (slide !== activeImageIndex) {
                                setActiveImageIndex(slide);
                            }
                        }}
                    >
                        {images.map((image, index) => (
                            <View
                                key={`${image}-${index}`}
                                style={{
                                    width,
                                    height: Math.round(width * 1.05),
                                }}
                                className="items-center justify-center bg-[#f4f4f4]"
                            >
                                <Image
                                    source={{ uri: image }}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                    }}
                                    resizeMode="cover"
                                />
                            </View>
                        ))}
                    </ScrollView>

                    {/* TOP ACTIONS */}
                    <SafeAreaView
                        edges={["top"]}
                        className="absolute left-4 right-4 top-2 z-20 flex-row items-center justify-between"
                    >
                        <TouchableOpacity
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
                            style={Platform.select({ web: { boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 } })}
                        >
                            <Ionicons
                                name="arrow-back"
                                size={20}
                                color="#111111"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => toggleWishlist(product)}
                            activeOpacity={0.8}
                            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
                            style={Platform.select({ web: { boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 } })}
                        >
                            <Ionicons
                                name={isLiked ? "heart" : "heart-outline"}
                                size={22}
                                color="#EF4444"
                            />
                        </TouchableOpacity>
                    </SafeAreaView>

                    {/* PAGINATION DOTS */}
                    {images.length > 1 ? (
                        <View className="absolute bottom-4 left-0 right-0 flex-row items-center justify-center gap-1.5">
                            {images.map((_, index) => (
                                <View
                                    key={index}
                                    className={`rounded-full ${index === activeImageIndex
                                        ? "h-1.5 w-6 bg-black"
                                        : "h-1.5 w-1.5 bg-white/70"
                                        }`}
                                />
                            ))}
                        </View>
                    ) : (
                        <View className="absolute bottom-4 left-0 right-0 flex-row items-center justify-center gap-1.5">
                            <View className="h-1.5 w-6 rounded-full bg-black" />
                            <View className="h-1.5 w-1.5 rounded-full bg-white/70" />
                            <View className="h-1.5 w-1.5 rounded-full bg-white/70" />
                        </View>
                    )}
                </View>

                {/* PRODUCT CONTENT */}
                <View className="px-5 pt-5">
                    {/* TITLE & RATING */}
                    <View className="flex-row items-start justify-between">
                        <Text className="mr-3 flex-1 text-xl font-bold leading-7 text-gray-900">
                            {product.name}
                        </Text>

                        <View className="flex-row items-center pt-1">
                            <Ionicons name="star" size={16} color="#FBBF24" />
                            <Text className="ml-1 text-sm font-bold text-gray-900">
                                {product.ratings?.average
                                    ? product.ratings.average.toFixed(1)
                                    : "4.6"}
                            </Text>
                            <Text className="ml-1 text-sm text-gray-400">
                                ({product.ratings?.count ?? 85})
                            </Text>
                        </View>
                    </View>

                    {/* PRICE */}
                    <Text className="mt-2 text-2xl font-bold text-gray-900">
                        ${product.price.toFixed(2)}
                    </Text>

                    {/* SIZE */}
                    <View className="mt-6">
                        <Text className="text-base font-bold text-gray-900">
                            Size
                        </Text>

                        <View className="mt-3 flex-row items-center gap-3">
                            {availableSizes.map((size) => {
                                const selected = selectedSize === size;
                                return (
                                    <TouchableOpacity
                                        key={size}
                                        onPress={() => setSelectedSize(size)}
                                        activeOpacity={0.8}
                                        className={`h-11 min-w-[48px] items-center justify-center rounded-xl border px-3 ${selected
                                            ? "border-black bg-black"
                                            : "border-gray-100 bg-gray-50"
                                            }`}
                                    >
                                        <Text
                                            className={`text-sm font-semibold ${selected
                                                ? "text-white"
                                                : "text-gray-800"
                                                }`}
                                        >
                                            {size}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* DESCRIPTION */}
                    <View className="mt-6">
                        <Text className="text-base font-bold text-gray-900">
                            Description
                        </Text>

                        <Text className="mt-2 text-sm leading-6 text-gray-500">
                            {product.description ||
                                "A lightweight, usually knitted, pullover shirt, close-fitting and with a round neckline and short sleeves, worn as an undershirt or outer garment."}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* BOTTOM BAR */}
            <SafeAreaView
                edges={["bottom"]}
                className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-5 py-3"
            >
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={handleAddToCart}
                        disabled={addingToCart}
                        activeOpacity={0.85}
                        className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-black"
                    >
                        {addingToCart ? (
                            <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                            />
                        ) : (
                            <>
                                <Ionicons
                                    name="bag-handle-outline"
                                    size={20}
                                    color="#FFFFFF"
                                />
                                <Text className="text-base font-bold text-white">
                                    Add to Cart
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)/cart")}
                        activeOpacity={0.85}
                        className="relative h-14 w-14 items-center justify-center"
                    >
                        <Ionicons
                            name="cart-outline"
                            size={28}
                            color="#111111"
                        />
                        {itemCount > 0 && (
                            <View className="absolute right-1.5 top-1.5 h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1">
                                <Text className="text-[10px] font-bold text-white">
                                    {itemCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}
