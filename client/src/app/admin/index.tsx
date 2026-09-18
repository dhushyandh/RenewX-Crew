import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, RefreshControl } from "react-native";
import { COLORS, getStatusColor } from "@/constants";
import { useAuth } from "@clerk/expo";
import api, { getAuthHeaders } from "@/constants/api";

type AdminStats = {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    recentOrders: any[];
};

const EMPTY_STATS: AdminStats = {
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    recentOrders: [],
};

export default function AdminDashboard() {
    const { getToken } = useAuth();
    const getTokenRef = useRef(getToken);
    getTokenRef.current = getToken;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);

    const requestInFlight = useRef(false);
    const lastRequestAt = useRef(0);
    const lastSuccessfulFetch = useRef(0);

    const fetchStats = useCallback(async (force = false) => {
        const now = Date.now();

        // Prevent duplicate focus/effect requests.
        if (requestInFlight.current) return;

        // Avoid repeatedly hitting the endpoint when the screen refocuses.
        if (!force && now - lastSuccessfulFetch.current < 10_000) return;

        // Even an explicit pull-to-refresh cannot fire requests continuously.
        if (force && now - lastRequestAt.current < 2_000) {
            setRefreshing(false);
            return;
        }

        requestInFlight.current = true;
        lastRequestAt.current = now;

        try {
            const headers = await getAuthHeaders(getTokenRef.current);
            const { data } = await api.get("/admin/stats", { headers });

            if (data?.success) {
                const payload = data.data ?? data;

                setStats({
                    totalUsers: Number(payload.totalUsers ?? 0),
                    totalProducts: Number(payload.totalProducts ?? 0),
                    totalOrders: Number(payload.totalOrder ?? payload.totalOrders ?? 0),
                    totalRevenue: Number(payload.totalRevenue ?? 0),
                    recentOrders: Array.isArray(payload.recentOrders) ? payload.recentOrders : [],
                });

                lastSuccessfulFetch.current = Date.now();
            }
        } catch (error: any) {
            // 429 is a transient server-side rate limit. Keep the last known
            // stats instead of logging noisy errors or replacing real data.
            if (error?.response?.status !== 429) {
                console.error("Failed to fetch admin stats", error);
            }
        } finally {
            requestInFlight.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void fetchStats();
        }, [fetchStats])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void fetchStats(true);
    }, [fetchStats]);

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-surface p-4"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View className="mb-8">
                <Text className="text-primary font-bold text-2xl mb-4 tracking-tight">Overview</Text>
                <View className="flex-row flex-wrap justify-between">
                    <StatCard label="Total Revenue" value={`₹${(stats.totalRevenue || 0).toFixed(2)}`} />
                    <StatCard label="Total Orders" value={(stats.totalOrders || 0).toString()} />
                    <StatCard label="Products" value={(stats.totalProducts || 0).toString()} />
                    <StatCard label="Users" value={(stats.totalUsers || 0).toString()} />
                </View>
            </View>

            <View className="mb-6">
                <Text className="text-primary font-bold text-2xl mb-4 tracking-tight">Recent Orders</Text>
                {stats.recentOrders.length === 0 ? (
                    <View className="bg-white p-6 rounded-2xl border border-gray-100 items-center">
                        <Text className="text-secondary">No recent orders</Text>
                    </View>
                ) : (
                    stats.recentOrders.map((order: any) => (
                        <View key={order._id} className="bg-white p-5 rounded-2xl border border-gray-100 mb-3">
                            <View className="flex-row justify-between items-center mb-3">
                                <View>
                                    <Text className="font-bold text-primary text-base">
                                        Total Products : {order.items?.reduce(
                                            (acc: number, item: any) => acc + (item.quantity || 0),
                                            0
                                        ) || 0}
                                    </Text>
                                    <Text className="text-secondary text-xs mt-1">
                                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                                    </Text>
                                </View>

                                <View className={`px-3 py-1.5 rounded-full ${getStatusColor(order.orderStatus)}`}>
                                    <Text className="text-[10px] font-bold uppercase">{order.orderStatus}</Text>
                                </View>
                            </View>

                            <View className="pb-2">
                                {order.items?.map((item: any) => (
                                    <Text key={item._id || item.name} className="text-secondary text-xs mt-1">
                                        {item.name} x {item.quantity}
                                    </Text>
                                ))}
                            </View>

                            <View className="h-[1px] bg-gray-100 mb-3" />

                            <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center">
                                    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2">
                                        <Text className="text-primary font-bold text-xs">
                                            {(order.user?.name || "?").charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text className="text-secondary text-sm">
                                        {order.user?.name || "Unknown User"}
                                    </Text>
                                </View>

                                <Text className="text-primary font-bold text-lg">
                                    ₹{(order.totalAmount || 0).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
    <View className="bg-white p-5 rounded-2xl border border-gray-100 w-[48%] mb-4 justify-center">
        <Text className="text-xl font-bold text-primary mb-1">{value}</Text>
        <Text className="text-secondary text-xs font-medium uppercase tracking-wide">{label}</Text>
    </View>
);
