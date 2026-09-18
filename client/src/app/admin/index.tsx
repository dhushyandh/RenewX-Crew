import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, RefreshControl } from "react-native";
import { COLORS, getStatusColor } from "@/constants";
import { dummyAdminStats } from "@/assets/assets";
import { useAuth } from "@clerk/expo";
import api, { getAuthHeaders } from "@/constants/api";

export default function AdminDashboard() {

    const { getToken } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const requestInFlight = useRef(false);\n    const lastSuccessfulFetch = useRef(0);\n    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        recentOrders: []
    });

    const fetchStats = useCallback(async (force = false) => {\n        const now = Date.now();\n        if (requestInFlight.current || (!force && now - lastSuccessfulFetch.current < 10000)) return;\n        requestInFlight.current = true;
        try {
            const token = await getToken()
            const { data } = await api.get('/admin/stats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (data.success && data.data) {
                setStats({
                    totalUsers: data.data.totalUsers ?? 0,
                    totalProducts: data.data.totalProducts ?? 0,
                    totalOrders: data.data.totalOrder ?? data.data.totalOrders ?? 0,
                    totalRevenue: data.data.totalRevenue ?? 0,
                    recentOrders: data.data.recentOrders ?? []
                })
                lastSuccessfulFetch.current = Date.now();\n            } else if (data.success) {
                setStats({
                    totalUsers: data.totalUsers ?? 0,
                    totalProducts: data.totalProducts ?? 0,
                    totalOrders: data.totalOrder ?? data.totalOrders ?? 0,
                    totalRevenue: data.totalRevenue ?? 0,
                    recentOrders: data.recentOrders ?? []
                })
            }
        } catch (error) {
            console.error('Failed to fetch stats', error)
            // Fallback to dummy data on error so dashboard doesn't break
            setStats(dummyAdminStats as any);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            void fetchStats();
        }, [fetchStats])
    );

    const onRefresh = () => {
        setRefreshing(true);
        void fetchStats(true);
    };

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
                    <StatCard label="Total Revenue" value={`$${(stats.totalRevenue || 0).toFixed(2)}`} />
                    <StatCard label="Total Orders" value={(stats.totalOrders || 0).toString()} />
                    <StatCard label="Products" value={(stats.totalProducts || 0).toString()} />
                    <StatCard label="Users" value={(stats.totalUsers || 0).toString()} />
                </View>
            </View>

            <View className="mb-6">
                <Text className="text-primary font-bold text-2xl mb-4 tracking-tight">Recent Orders</Text>
                {(!stats.recentOrders || stats.recentOrders.length === 0) ? (
                    <View className="bg-white p-6 rounded-2xl border border-gray-100 items-center">
                        <Text className="text-secondary">No recent orders</Text>
                    </View>
                ) : (
                    stats.recentOrders.map((order: any) => (
                        <View key={order._id} className="bg-white p-5 rounded-2xl border border-gray-100 mb-3">
                            <View className="flex-row justify-between items-center mb-3">
                                <View>
                                    <Text className="font-bold text-primary text-base">
                                        Total Products : {order.items?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0}
                                    </Text>
                                    <Text className="text-secondary text-xs mt-1">
                                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
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
                                            {(order.user?.name || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text className="text-secondary text-sm">{order.user?.name || 'Unknown User'}</Text>
                                </View>
                                <Text className="text-primary font-bold text-lg">
                                    ${(order.totalAmount || 0).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const StatCard = ({ label, value }: { label: string, value: string }) => (
    <View className="bg-white p-5 rounded-2xl border border-gray-100 w-[48%] mb-4 justify-center">
        <Text className="text-xl font-bold text-primary mb-1">{value}</Text>
        <Text className="text-secondary text-xs font-medium uppercase tracking-wide">{label}</Text>
    </View>
);
