import React, { useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function OrderPlaced() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        orderId?: string;
        orderNumber?: string;
        totalAmount?: string;
        paymentMethod?: string;
        itemCount?: string;
        address?: string;
        city?: string;
        name?: string;
    }>();

    const orderNumber = params.orderNumber || (params.orderId ? `ORD-${params.orderId.slice(-6).toUpperCase()}` : `ORD-${Date.now().toString().slice(-6)}`);
    const totalAmount = params.totalAmount ? Number(params.totalAmount).toFixed(2) : "0.00";
    const paymentMethodLabel = params.paymentMethod === "cod"
        ? "Cash on Delivery"
        : params.paymentMethod === "upi"
            ? "UPI Instant"
            : params.paymentMethod === "card"
                ? "Credit / Debit Card"
                : "Online Payment";

    // Disable Android physical hardware back button from navigating back into checkout
    useEffect(() => {
        const onBackPress = () => {
            router.replace("/(tabs)");
            return true;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => backHandler.remove();
    }, [router]);

    // Estimated delivery date (3-5 days from now)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 4);
    const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            {/* Header with Close / Home button */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => router.replace("/(tabs)")}
                    activeOpacity={0.8}
                >
                    <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Order Confirmation</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Celebration Icon & Success Message */}
                <View style={styles.heroSection}>
                    <View style={styles.iconRingOuter}>
                        <View style={styles.iconRingInner}>
                            <Ionicons name="checkmark" size={44} color="#FFFFFF" />
                        </View>
                    </View>

                    <Text style={styles.celebrationTitle}>Order Placed!</Text>
                    <Text style={styles.celebrationSubtitle}>
                        Your order has been placed successfully and is being prepared for shipment.
                    </Text>

                    <View style={styles.orderNumberBadge}>
                        <Ionicons name="receipt-outline" size={16} color="#4F46E5" />
                        <Text style={styles.orderNumberText}>Order #{orderNumber}</Text>
                    </View>
                </View>

                {/* Delivery Timeline Progress */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Order Progress</Text>

                    <View style={styles.timelineRow}>
                        {/* Step 1 */}
                        <View style={styles.timelineStep}>
                            <View style={[styles.timelineDot, styles.timelineDotActive]}>
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </View>
                            <Text style={styles.timelineLabelActive}>Placed</Text>
                        </View>

                        <View style={[styles.timelineLine, styles.timelineLineActive]} />

                        {/* Step 2 */}
                        <View style={styles.timelineStep}>
                            <View style={[styles.timelineDot, styles.timelineDotActive]}>
                                <Ionicons name="sync" size={12} color="#FFFFFF" />
                            </View>
                            <Text style={styles.timelineLabelActive}>Processing</Text>
                        </View>

                        <View style={styles.timelineLine} />

                        {/* Step 3 */}
                        <View style={styles.timelineStep}>
                            <View style={styles.timelineDot}>
                                <Ionicons name="cube-outline" size={12} color="#9CA3AF" />
                            </View>
                            <Text style={styles.timelineLabel}>Shipped</Text>
                        </View>

                        <View style={styles.timelineLine} />

                        {/* Step 4 */}
                        <View style={styles.timelineStep}>
                            <View style={styles.timelineDot}>
                                <Ionicons name="home-outline" size={12} color="#9CA3AF" />
                            </View>
                            <Text style={styles.timelineLabel}>Delivered</Text>
                        </View>
                    </View>

                    <View style={styles.deliveryEstimateBox}>
                        <Ionicons name="time-outline" size={18} color="#059669" />
                        <Text style={styles.deliveryEstimateText}>
                            Estimated Delivery: <Text style={{ fontWeight: "700" }}>{formattedDeliveryDate}</Text>
                        </Text>
                    </View>
                </View>

                {/* Order Summary & Payment */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Order Summary</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Total Amount</Text>
                        <Text style={styles.infoValueHighlight}>${totalAmount}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Payment Method</Text>
                        <View style={styles.badgeRow}>
                            <Ionicons
                                name={params.paymentMethod === "cod" ? "cash-outline" : "card-outline"}
                                size={15}
                                color="#374151"
                            />
                            <Text style={styles.badgeText}>{paymentMethodLabel}</Text>
                        </View>
                    </View>

                    {params.address ? (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.addressBox}>
                                <Ionicons name="location-outline" size={18} color="#6B7280" style={{ marginTop: 2 }} />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.infoLabel}>Shipping Address</Text>
                                    <Text style={styles.addressText}>
                                        {params.address}{params.city ? `, ${params.city}` : ""}
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => router.replace("/orders" as any)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="receipt-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Track Your Orders</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => router.replace("/(tabs)")}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="bag-handle-outline" size={20} color="#111827" style={{ marginRight: 8 }} />
                        <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    topBarTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    heroSection: {
        alignItems: "center",
        marginVertical: 16,
    },
    iconRingOuter: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    iconRingInner: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#10B981",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    celebrationTitle: {
        fontSize: 26,
        fontWeight: "800",
        color: "#111827",
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    celebrationSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
        maxWidth: 300,
        marginBottom: 16,
    },
    orderNumberBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E0E7FF",
    },
    orderNumberText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#4F46E5",
        marginLeft: 6,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 16,
    },
    timelineRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    timelineStep: {
        alignItems: "center",
        width: 60,
    },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    timelineDotActive: {
        backgroundColor: "#10B981",
    },
    timelineLabel: {
        fontSize: 11,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    timelineLabelActive: {
        fontSize: 11,
        color: "#10B981",
        fontWeight: "700",
    },
    timelineLine: {
        flex: 1,
        height: 2,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 2,
        marginBottom: 18,
    },
    timelineLineActive: {
        backgroundColor: "#10B981",
    },
    deliveryEstimateBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ECFDF5",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D1FAE5",
    },
    deliveryEstimateText: {
        fontSize: 13,
        color: "#065F46",
        marginLeft: 8,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
    },
    infoLabel: {
        fontSize: 14,
        color: "#6B7280",
    },
    infoValueHighlight: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginVertical: 10,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
        marginLeft: 4,
    },
    addressBox: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    addressText: {
        fontSize: 13,
        color: "#1F2937",
        fontWeight: "500",
        marginTop: 2,
    },
    actionContainer: {
        marginTop: 8,
        gap: 12,
    },
    primaryBtn: {
        backgroundColor: "#111827",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    primaryBtnText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },
    secondaryBtn: {
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
    },
    secondaryBtnText: {
        color: "#111827",
        fontSize: 15,
        fontWeight: "700",
    },
});
