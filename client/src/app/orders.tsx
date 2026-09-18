import React, { useEffect, useState, useCallback } from "react";
import { Platform,
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";

import { COLORS, getStatusColor } from "@/constants";
import api, { getAuthHeaders } from "@/constants/api";

type OrderItem = {
    _id?: string;
    product?: any;
    name: string;
    price: number;
    quantity: number;
    size: string;
};

type Order = {
    _id: string;
    orderNumber?: string;
    items: OrderItem[];
    totalAmount: number;
    orderStatus: string;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    shippingAddress?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
    };
};

export default function OrdersScreen() {
    const router = useRouter();
    const { getToken } = useAuth();
    const { isSignedIn } = useUser();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            if (isSignedIn) {
                const authConfig = await getAuthHeaders(getToken);
                const response = await api.get("/orders", authConfig);
                if (response.data?.success && response.data?.orders) {
                    setOrders(response.data.orders);
                    return;
                }
            }
            setOrders([]);
        } catch (error) {
            console.warn("Failed to fetch live orders:", error);
            setOrders([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isSignedIn, getToken]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const renderOrderItem = ({ item }: { item: Order }) => {
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }) : "Recent";

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderNumber}>
                            {item.orderNumber || `Order #${item._id.slice(-6).toUpperCase()}`}
                        </Text>
                        <Text style={styles.orderDate}>{dateStr}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.orderStatus === 'delivered' ? '#E8F8EE' : item.orderStatus === 'cancelled' ? '#FEECEB' : '#EFF6FF' }]}>
                        <Text style={[styles.statusText, { color: item.orderStatus === 'delivered' ? '#258A55' : item.orderStatus === 'cancelled' ? '#EF4444' : '#2563EB' }]}>
                            {item.orderStatus}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {item.items?.map((orderItem, idx) => (
                    <View key={orderItem._id || idx} style={styles.itemRow}>
                        <View style={styles.itemBullet} />
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={1}>
                                {orderItem.name || orderItem.product?.name || "Product"}
                            </Text>
                            <Text style={styles.itemMeta}>
                                Size: {orderItem.size}  •  Qty: {orderItem.quantity}
                            </Text>
                        </View>
                        <Text style={styles.itemPrice}>
                            ₹{((orderItem.price || 0) * (orderItem.quantity || 1)).toFixed(2)}
                        </Text>
                    </View>
                ))}

                <View style={styles.divider} />

                <View style={styles.orderFooter}>
                    <View>
                        <Text style={styles.paymentMethod}>
                            Payment: {item.paymentMethod?.toUpperCase() || 'COD'} ({item.paymentStatus || 'pending'})
                        </Text>
                    </View>
                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Total: </Text>
                        <Text style={styles.totalAmount}>₹{(item.totalAmount || 0).toFixed(2)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#171717" />
                </Pressable>
                <Text style={styles.headerTitle}>My Orders</Text>
                <View style={{ width: 38 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBg}>
                        <Ionicons name="receipt-outline" size={48} color="#999999" />
                    </View>
                    <Text style={styles.emptyTitle}>No Orders Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        When you purchase items, your order history and live shipment tracking will appear here.
                    </Text>
                    <Pressable
                        onPress={() => router.push("/shop")}
                        style={styles.shopButton}
                    >
                        <Text style={styles.shopButtonText}>Start Shopping</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item._id}
                    renderItem={renderOrderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7F7F8",
    },
    header: {
        height: 56,
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
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    orderCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        ...(Platform.OS === "web" ? { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" } : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }),
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    orderNumber: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111827",
    },
    orderDate: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginVertical: 12,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 4,
    },
    itemBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginRight: 10,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    itemMeta: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
    },
    orderFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    paymentMethod: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    totalContainer: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    totalLabel: {
        fontSize: 13,
        color: "#4B5563",
    },
    totalAmount: {
        fontSize: 17,
        fontWeight: "800",
        color: COLORS.primary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyIconBg: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
    },
    shopButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    shopButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
});
