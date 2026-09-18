import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { Product } from "@/constants/types";
import { CATEGORIES, COLORS } from "@/constants";
import api from "@/constants/api";

import Header from "../../components/Header";
import ProductCard from "../../components/ProductCard";

type SortOption =
    | "default"
    | "price-low"
    | "price-high"
    | "rating";

type StockFilter = "all" | "in-stock";

type PriceFilter =
    | "all"
    | "under-50"
    | "50-100"
    | "above-100";

export default function Shop() {
    const params = useLocalSearchParams<{ category?: string }>();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(params.category || "All");

    useEffect(() => {
        if (params.category) {
            setSelectedCategory(params.category);
        }
    }, [params.category]);

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products?limit=100');
            if (data.success && data.data && data.data.length > 0) {
                setAllProducts(data.data);
            } else {
                setAllProducts([]);
            }
        } catch (error) {
            console.warn('Failed to fetch products in Shop:', error);
            setAllProducts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchProducts();
    };

    const [filterVisible, setFilterVisible] = useState(false);

    // Temporary filter values inside the modal
    const [tempCategory, setTempCategory] = useState("All");
    const [tempSort, setTempSort] =
        useState<SortOption>("default");
    const [tempStock, setTempStock] =
        useState<StockFilter>("all");
    const [tempPrice, setTempPrice] =
        useState<PriceFilter>("all");

    // Applied filters
    const [sortOption, setSortOption] =
        useState<SortOption>("default");
    const [stockFilter, setStockFilter] =
        useState<StockFilter>("all");
    const [priceFilter, setPriceFilter] =
        useState<PriceFilter>("all");

    const categories = useMemo(
        () => [
            { id: "all", name: "All" },
            ...CATEGORIES.map((category) => ({
                id: String(category.id),
                name: category.name,
            })),
        ],
        []
    );

    /*
     * Count active filters.
     * Category "All", default sort, all stock and all price
     * don't count as active filters.
     */
    const activeFilterCount = useMemo(() => {
        let count = 0;

        if (selectedCategory !== "All") count++;
        if (sortOption !== "default") count++;
        if (stockFilter !== "all") count++;
        if (priceFilter !== "all") count++;

        return count;
    }, [
        selectedCategory,
        sortOption,
        stockFilter,
        priceFilter,
    ]);

    /*
     * FILTER + SEARCH + SORT
     */
    const filteredProducts = useMemo(() => {
        let products = allProducts.filter((product) => {
            // Search
            const query = searchQuery.trim().toLowerCase();

            const matchesSearch =
                query.length === 0 ||
                product.name.toLowerCase().includes(query) ||
                (product.description && product.description.toLowerCase().includes(query));

            // Category
            const categoryName = typeof product.category === 'object' ? (product.category as any)?.name : (product.category ?? "");

            const matchesCategory =
                selectedCategory === "All" ||
                categoryName.toLowerCase() ===
                    selectedCategory.toLowerCase();

            // Stock
            const matchesStock =
                stockFilter === "all" ||
                product.stock > 0;

            // Price
            const matchesPrice = (() => {
                switch (priceFilter) {
                    case "under-50":
                        return product.price < 50;

                    case "50-100":
                        return (
                            product.price >= 50 &&
                            product.price <= 100
                        );

                    case "above-100":
                        return product.price > 100;

                    default:
                        return true;
                }
            })();

            return (
                matchesSearch &&
                matchesCategory &&
                matchesStock &&
                matchesPrice
            );
        });

        // Sort
        products = [...products].sort((a, b) => {
            switch (sortOption) {
                case "price-low":
                    return a.price - b.price;

                case "price-high":
                    return b.price - a.price;

                case "rating":
                    return (
                        (b.ratings?.average ?? 0) -
                        (a.ratings?.average ?? 0)
                    );

                default:
                    return 0;
            }
        });

        return products;
    }, [
        searchQuery,
        selectedCategory,
        sortOption,
        stockFilter,
        priceFilter,
    ]);

    /*
     * OPEN FILTER MODAL
     *
     * Copy current applied filters into temporary values.
     */
    const openFilters = () => {
        setTempCategory(selectedCategory);
        setTempSort(sortOption);
        setTempStock(stockFilter);
        setTempPrice(priceFilter);

        setFilterVisible(true);
    };

    /*
     * APPLY FILTERS
     */
    const applyFilters = () => {
        setSelectedCategory(tempCategory);
        setSortOption(tempSort);
        setStockFilter(tempStock);
        setPriceFilter(tempPrice);

        setFilterVisible(false);
    };

    /*
     * CLEAR EVERYTHING
     */
    const clearFilters = () => {
        setTempCategory("All");
        setTempSort("default");
        setTempStock("all");
        setTempPrice("all");

        setSelectedCategory("All");
        setSortOption("default");
        setStockFilter("all");
        setPriceFilter("all");
    };

    /*
     * SORT LABEL
     */
    const sortLabel = useMemo(() => {
        switch (sortOption) {
            case "price-low":
                return "Price: Low to High";

            case "price-high":
                return "Price: High to Low";

            case "rating":
                return "Top Rated";

            default:
                return "Recommended";
        }
    }, [sortOption]);

    return (
        <SafeAreaView
            className="flex-1 bg-surface"
            edges={["top"]}
        >
            <Header
                title="Shop"
                showBack
                showCart
            />

            {/* ========================================= */}
            {/* SEARCH & FILTER BAR */}
            {/* ========================================= */}

            <View className="px-4 pb-2 pt-3">
                <View className="flex-row items-center gap-2.5">
                    {/* SEARCH */}
                    <View className="h-12 flex-1 flex-row items-center rounded-2xl border border-gray-100 bg-white px-3.5 shadow-sm">
                        <Ionicons
                            name="search-outline"
                            size={20}
                            color={COLORS.secondary}
                        />

                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search products, brands..."
                            placeholderTextColor="#9CA3AF"
                            className="ml-2.5 h-full flex-1 text-base font-normal text-gray-900"
                            returnKeyType="search"
                            autoCapitalize="none"
                            clearButtonMode="while-editing"
                        />

                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() =>
                                    setSearchQuery("")
                                }
                                hitSlop={{
                                    top: 10,
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="close-circle"
                                    size={18}
                                    color="#9CA3AF"
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* FILTER BUTTON */}
                    <TouchableOpacity
                        onPress={openFilters}
                        activeOpacity={0.8}
                        className="relative h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm"
                    >
                        <Ionicons
                            name="options-outline"
                            size={21}
                            color={COLORS.primary}
                        />

                        {/* ACTIVE FILTER BADGE */}
                        {activeFilterCount > 0 && (
                            <View
                                className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full px-1"
                                style={{
                                    backgroundColor:
                                        COLORS.accent,
                                }}
                            >
                                <Text className="text-[10px] font-bold text-white">
                                    {activeFilterCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* ========================================= */}
            {/* CATEGORY CHIPS */}
            {/* ========================================= */}

            <View className="py-2">
                <FlatList
                    horizontal
                    data={categories}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        gap: 8,
                    }}
                    renderItem={({ item }) => {
                        const isSelected =
                            selectedCategory.toLowerCase() ===
                            item.name.toLowerCase();

                        return (
                            <TouchableOpacity
                                onPress={() =>
                                    setSelectedCategory(
                                        item.name
                                    )
                                }
                                activeOpacity={0.8}
                                className={`rounded-full border px-4 py-2 ${
                                    isSelected
                                        ? "border-black bg-black"
                                        : "border-gray-100 bg-white"
                                }`}
                            >
                                <Text
                                    className={`text-xs font-semibold ${
                                        isSelected
                                            ? "text-white"
                                            : "text-gray-600"
                                    }`}
                                >
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* ========================================= */}
            {/* RESULTS HEADER */}
            {/* ========================================= */}

            <View className="flex-row items-center justify-between px-4 py-2">
                <View>
                    <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {filteredProducts.length}{" "}
                        {filteredProducts.length === 1
                            ? "Product"
                            : "Products"}{" "}
                        found
                    </Text>

                    {sortOption !== "default" && (
                        <Text className="mt-1 text-xs text-gray-400">
                            {sortLabel}
                        </Text>
                    )}
                </View>

                {activeFilterCount > 0 && (
                    <TouchableOpacity
                        onPress={clearFilters}
                        activeOpacity={0.7}
                    >
                        <Text
                            className="text-xs font-semibold"
                            style={{
                                color: COLORS.primary,
                            }}
                        >
                            Clear filters
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ========================================= */}
            {/* PRODUCT GRID */}
            {/* ========================================= */}

            <FlatList
                data={filteredProducts}
                keyExtractor={(item, index) => item._id ? `${item._id}-${index}` : String(index)}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
                columnWrapperStyle={{
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                }}
                contentContainerStyle={{
                    paddingTop: 4,
                    paddingBottom: 40,
                }}
                renderItem={({ item }) => (
                    <ProductCard product={item} />
                )}
                ListEmptyComponent={
                    <View className="items-center justify-center px-4 py-20">
                        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                            <Ionicons
                                name="search-outline"
                                size={30}
                                color={COLORS.secondary}
                            />
                        </View>

                        <Text className="text-lg font-bold text-gray-900">
                            No products found
                        </Text>

                        <Text className="mt-1 text-center text-sm text-gray-500">
                            Try changing your search or
                            filters.
                        </Text>

                        {(searchQuery.length > 0 ||
                            activeFilterCount > 0) && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchQuery("");
                                    clearFilters();
                                }}
                                activeOpacity={0.8}
                                className="mt-4 rounded-full bg-black px-5 py-2.5"
                            >
                                <Text className="text-xs font-bold text-white">
                                    Reset Filters
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            {/* ========================================= */}
            {/* FILTER MODAL */}
            {/* ========================================= */}

            <Modal
                visible={filterVisible}
                transparent
                animationType="slide"
                onRequestClose={() =>
                    setFilterVisible(false)
                }
            >
                <View className="flex-1 justify-end">
                    {/* BACKDROP */}
                    <Pressable
                        className="absolute inset-0 bg-black/40"
                        onPress={() =>
                            setFilterVisible(false)
                        }
                    />

                    {/* BOTTOM SHEET */}
                    <View className="max-h-[88%] rounded-t-[30px] bg-white px-5 pb-6 pt-4">
                        {/* HANDLE */}
                        <View className="mb-4 items-center">
                            <View className="h-1.5 w-12 rounded-full bg-gray-200" />
                        </View>

                        {/* HEADER */}
                        <View className="mb-5 flex-row items-center justify-between">
                            <View>
                                <Text className="text-2xl font-bold text-gray-900">
                                    Filters
                                </Text>

                                <Text className="mt-1 text-sm text-gray-400">
                                    Refine your product search
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() =>
                                    setFilterVisible(false)
                                }
                                activeOpacity={0.7}
                                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                            >
                                <Ionicons
                                    name="close"
                                    size={22}
                                    color="#111111"
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingBottom: 20,
                            }}
                        >
                            {/* ================================= */}
                            {/* CATEGORY */}
                            {/* ================================= */}

                            <Text className="mb-3 text-base font-bold text-gray-900">
                                Category
                            </Text>

                            <View className="flex-row flex-wrap gap-2">
                                {categories.map((category) => {
                                    const selected =
                                        tempCategory ===
                                        category.name;

                                    return (
                                        <TouchableOpacity
                                            key={category.id}
                                            onPress={() =>
                                                setTempCategory(
                                                    category.name
                                                )
                                            }
                                            activeOpacity={0.8}
                                            className="rounded-full border px-4 py-2.5"
                                            style={{
                                                borderColor:
                                                    selected
                                                        ? COLORS.primary
                                                        : "#E5E7EB",
                                                backgroundColor:
                                                    selected
                                                        ? COLORS.primary
                                                        : "#FFFFFF",
                                            }}
                                        >
                                            <Text
                                                className={`text-sm font-semibold ${
                                                    selected
                                                        ? "text-white"
                                                        : "text-gray-600"
                                                }`}
                                            >
                                                {category.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* ================================= */}
                            {/* SORT */}
                            {/* ================================= */}

                            <Text className="mb-3 mt-7 text-base font-bold text-gray-900">
                                Sort By
                            </Text>

                            <View className="gap-2">
                                {[
                                    {
                                        value: "default",
                                        label: "Recommended",
                                        icon: "sparkles-outline",
                                    },
                                    {
                                        value: "price-low",
                                        label: "Price: Low to High",
                                        icon: "arrow-down-outline",
                                    },
                                    {
                                        value: "price-high",
                                        label: "Price: High to Low",
                                        icon: "arrow-up-outline",
                                    },
                                    {
                                        value: "rating",
                                        label: "Top Rated",
                                        icon: "star-outline",
                                    },
                                ].map((option) => {
                                    const selected =
                                        tempSort ===
                                        option.value;

                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() =>
                                                setTempSort(
                                                    option.value as SortOption
                                                )
                                            }
                                            activeOpacity={0.8}
                                            className="flex-row items-center rounded-2xl border px-4 py-3"
                                            style={{
                                                borderColor:
                                                    selected
                                                        ? COLORS.primary
                                                        : "#E5E7EB",
                                                backgroundColor:
                                                    selected
                                                        ? "#F7F7F7"
                                                        : "#FFFFFF",
                                            }}
                                        >
                                            <View
                                                className="h-9 w-9 items-center justify-center rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        selected
                                                            ? COLORS.primary
                                                            : "#F3F4F6",
                                                }}
                                            >
                                                <Ionicons
                                                    name={
                                                        option.icon as any
                                                    }
                                                    size={18}
                                                    color={
                                                        selected
                                                            ? "#FFFFFF"
                                                            : COLORS.primary
                                                    }
                                                />
                                            </View>

                                            <Text className="ml-3 flex-1 text-sm font-semibold text-gray-800">
                                                {option.label}
                                            </Text>

                                            {selected && (
                                                <Ionicons
                                                    name="checkmark-circle"
                                                    size={21}
                                                    color={
                                                        COLORS.primary
                                                    }
                                                />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* ================================= */}
                            {/* PRICE */}
                            {/* ================================= */}

                            <Text className="mb-3 mt-7 text-base font-bold text-gray-900">
                                Price Range
                            </Text>

                            <View className="flex-row flex-wrap gap-2">
                                {[
                                    {
                                        value: "all",
                                        label: "All Prices",
                                    },
                                    {
                                        value: "under-50",
                                        label: "Under $50",
                                    },
                                    {
                                        value: "50-100",
                                        label: "$50 - $100",
                                    },
                                    {
                                        value: "above-100",
                                        label: "Above $100",
                                    },
                                ].map((option) => {
                                    const selected =
                                        tempPrice ===
                                        option.value;

                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() =>
                                                setTempPrice(
                                                    option.value as PriceFilter
                                                )
                                            }
                                            activeOpacity={0.8}
                                            className="rounded-full border px-4 py-2.5"
                                            style={{
                                                borderColor:
                                                    selected
                                                        ? COLORS.primary
                                                        : "#E5E7EB",
                                                backgroundColor:
                                                    selected
                                                        ? COLORS.primary
                                                        : "#FFFFFF",
                                            }}
                                        >
                                            <Text
                                                className={`text-sm font-semibold ${
                                                    selected
                                                        ? "text-white"
                                                        : "text-gray-600"
                                                }`}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* ================================= */}
                            {/* AVAILABILITY */}
                            {/* ================================= */}

                            <Text className="mb-3 mt-7 text-base font-bold text-gray-900">
                                Availability
                            </Text>

                            <View className="flex-row gap-2">
                                {[
                                    {
                                        value: "all",
                                        label: "All Products",
                                    },
                                    {
                                        value: "in-stock",
                                        label: "In Stock Only",
                                    },
                                ].map((option) => {
                                    const selected =
                                        tempStock ===
                                        option.value;

                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() =>
                                                setTempStock(
                                                    option.value as StockFilter
                                                )
                                            }
                                            activeOpacity={0.8}
                                            className="flex-1 items-center rounded-full border px-3 py-3"
                                            style={{
                                                borderColor:
                                                    selected
                                                        ? COLORS.primary
                                                        : "#E5E7EB",
                                                backgroundColor:
                                                    selected
                                                        ? COLORS.primary
                                                        : "#FFFFFF",
                                            }}
                                        >
                                            <Text
                                                className={`text-sm font-semibold ${
                                                    selected
                                                        ? "text-white"
                                                        : "text-gray-600"
                                                }`}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* ================================= */}
                        {/* BOTTOM ACTIONS */}
                        {/* ================================= */}

                        <View className="flex-row gap-3 border-t border-gray-100 pt-4">
                            <TouchableOpacity
                                onPress={() => {
                                    setTempCategory("All");
                                    setTempSort("default");
                                    setTempStock("all");
                                    setTempPrice("all");
                                }}
                                activeOpacity={0.8}
                                className="h-14 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white"
                            >
                                <Text className="text-sm font-bold text-gray-800">
                                    Clear All
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={applyFilters}
                                activeOpacity={0.85}
                                className="h-14 flex-[1.5] flex-row items-center justify-center rounded-2xl"
                                style={{
                                    backgroundColor:
                                        COLORS.primary,
                                }}
                            >
                                <Ionicons
                                    name="checkmark"
                                    size={20}
                                    color="#FFFFFF"
                                />

                                <Text className="ml-2 text-sm font-bold text-white">
                                    Show{" "}
                                    {filteredProducts.length}{" "}
                                    Products
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

