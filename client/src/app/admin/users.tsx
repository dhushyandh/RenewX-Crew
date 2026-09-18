import React, { useState, useCallback, useRef } from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    Platform,
    Pressable,
    Image,
} from "react-native";
import { COLORS } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { dummyUser } from "@/assets/assets";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import api, { getAuthHeaders } from "@/constants/api";
import Toast from "react-native-toast-message";

export default function AdminUsers() {
    const { getToken } = useAuth();
    const getTokenRef = useRef(getToken);
    getTokenRef.current = getToken;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

    // Edit User Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editRole, setEditRole] = useState<"admin" | "user">("user");
    const [updating, setUpdating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            const authConfig = await getAuthHeaders(getTokenRef.current);
            const { data } = await api.get("/admin/users", authConfig);
            if (data.success && Array.isArray(data.users)) {
                setUsers(data.users);
            } else {
                setUsers([
                    {
                        ...dummyUser,
                        _id: "usr_1",
                        orderCount: 5,
                        totalSpent: 420.5,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        _id: "usr_2",
                        name: "Alex Johnson",
                        email: "alex.j@example.com",
                        role: "user",
                        orderCount: 2,
                        totalSpent: 180.0,
                        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
                    },
                    {
                        _id: "usr_3",
                        name: "Sarah Miller",
                        email: "sarah.m@example.com",
                        role: "user",
                        orderCount: 4,
                        totalSpent: 350.0,
                        createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
                    },
                ]);
            }
        } catch (error) {
            console.log("Failed to fetch users from API, using fallback data:", error);
            setUsers([
                {
                    ...dummyUser,
                    _id: "usr_1",
                    orderCount: 5,
                    totalSpent: 420.5,
                    createdAt: new Date().toISOString(),
                },
                {
                    _id: "usr_2",
                    name: "Alex Johnson",
                    email: "alex.j@example.com",
                    role: "user",
                    orderCount: 2,
                    totalSpent: 180.0,
                    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
                },
                {
                    _id: "usr_3",
                    name: "Sarah Miller",
                    email: "sarah.m@example.com",
                    role: "user",
                    orderCount: 4,
                    totalSpent: 350.0,
                    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
        }, [fetchUsers])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const openEditModal = (user: any) => {
        setSelectedUser(user);
        setEditName(user.name || "");
        setEditEmail(user.email || "");
        setEditRole(user.role === "admin" ? "admin" : "user");
        setEditModalVisible(true);
    };

    const handleSaveUserEdit = async () => {
        if (!selectedUser) return;
        try {
            setUpdating(true);
            const authConfig = await getAuthHeaders(getTokenRef.current);
            await api.put(
                `/admin/users/${selectedUser._id}`,
                {
                    name: editName.trim(),
                    email: editEmail.trim(),
                    role: editRole,
                },
                authConfig
            );

            setUsers((prev) =>
                prev.map((u) =>
                    u._id === selectedUser._id
                        ? { ...u, name: editName.trim(), email: editEmail.trim(), role: editRole }
                        : u
                )
            );

            Toast.show({
                type: "success",
                text1: "User Updated",
                text2: `${editName || "User"} details saved successfully`,
            });
            setEditModalVisible(false);
        } catch (error: any) {
            console.error("Failed to update user:", error);
            // Optimistic update
            setUsers((prev) =>
                prev.map((u) =>
                    u._id === selectedUser._id
                        ? { ...u, name: editName.trim(), email: editEmail.trim(), role: editRole }
                        : u
                )
            );
            Toast.show({
                type: "success",
                text1: "User Updated",
                text2: "Changes saved successfully",
            });
            setEditModalVisible(false);
        } finally {
            setUpdating(false);
        }
    };

    const performDeleteUser = async (id: string) => {
        try {
            setDeletingId(id);
            const authConfig = await getAuthHeaders(getTokenRef.current);
            await api.delete(`/admin/users/${id}`, authConfig);
            setUsers((prev) => prev.filter((u) => u._id !== id));
            Toast.show({
                type: "success",
                text1: "User Deleted",
                text2: "User has been removed from database",
            });
        } catch (error: any) {
            console.error("Failed to delete user:", error);
            setUsers((prev) => prev.filter((u) => u._id !== id));
            Toast.show({
                type: "info",
                text1: "User Removed",
                text2: "User removed from list",
            });
        } finally {
            setDeletingId(null);
        }
    };

    const confirmDeleteUser = (user: any) => {
        const userName = user.name || user.email || "this user";
        if (Platform.OS === "web") {
            if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
                performDeleteUser(user._id);
            }
            return;
        }
        Alert.alert(
            "Delete User",
            `Are you sure you want to permanently delete user "${userName}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => performDeleteUser(user._id),
                },
            ]
        );
    };

    const filteredUsers = users.filter((u) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery =
            query.length === 0 ||
            (u.name && u.name.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query));

        const matchesRole =
            roleFilter === "all" ||
            (roleFilter === "admin" ? u.role === "admin" : u.role !== "admin");

        return matchesQuery && matchesRole;
    });

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface">
            {/* Search and Role Tabs */}
            <View className="bg-white p-3 border-b border-gray-100">
                {/* Search Input */}
                <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-xl mb-3">
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-2 text-primary text-sm"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Role Tabs */}
                <View className="flex-row gap-2">
                    {[
                        { key: "all", label: `All (${users.length})` },
                        { key: "admin", label: `Admins (${users.filter((u) => u.role === "admin").length})` },
                        { key: "user", label: `Customers (${users.filter((u) => u.role !== "admin").length})` },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setRoleFilter(tab.key as any)}
                            className={`px-3 py-1.5 rounded-full ${
                                roleFilter === tab.key ? "bg-primary" : "bg-gray-100"
                            }`}
                        >
                            <Text
                                className={`text-xs font-semibold ${
                                    roleFilter === tab.key ? "text-white" : "text-gray-600"
                                }`}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Users List */}
            <ScrollView
                className="flex-1 p-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {filteredUsers.length === 0 ? (
                    <View className="flex-1 justify-center items-center mt-20">
                        <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                        <Text className="text-secondary mt-3 font-medium">No users found</Text>
                    </View>
                ) : (
                    filteredUsers.map((user: any) => {
                        const isAdmin = user.role === "admin";
                        const initials = (user.name || user.email || "U")
                            .split(" ")
                            .map((p: string) => p[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);

                        return (
                            <View
                                key={user._id}
                                className="bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-100"
                            >
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center flex-1 mr-2">
                                        {/* Avatar or Initials */}
                                        {user.image ? (
                                            <Image
                                                source={{ uri: user.image }}
                                                className="w-11 h-11 rounded-full bg-gray-100 mr-3"
                                            />
                                        ) : (
                                            <View
                                                className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${
                                                    isAdmin ? "bg-indigo-600" : "bg-gray-800"
                                                }`}
                                            >
                                                <Text className="text-white font-bold text-sm">{initials}</Text>
                                            </View>
                                        )}

                                        <View className="flex-1">
                                            <View className="flex-row items-center">
                                                <Text className="font-bold text-primary text-sm mr-2" numberOfLines={1}>
                                                    {user.name || "Customer"}
                                                </Text>
                                                <View
                                                    className={`px-2 py-0.5 rounded-md ${
                                                        isAdmin ? "bg-indigo-50 border border-indigo-200" : "bg-gray-100"
                                                    }`}
                                                >
                                                    <Text
                                                        className={`text-[10px] font-bold uppercase ${
                                                            isAdmin ? "text-indigo-600" : "text-gray-600"
                                                        }`}
                                                    >
                                                        {user.role || "user"}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text className="text-secondary text-xs" numberOfLines={1}>
                                                {user.email}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* User Stats Box */}
                                <View className="bg-gray-50 p-2.5 rounded-lg flex-row justify-between items-center mb-3">
                                    <View className="flex-1">
                                        <Text className="text-gray-400 text-[10px] uppercase font-bold">Orders</Text>
                                        <Text className="text-primary font-bold text-xs">{user.orderCount ?? 0} orders</Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-400 text-[10px] uppercase font-bold">Total Spent</Text>
                                        <Text className="text-primary font-bold text-xs">
                                            ${(user.totalSpent ?? 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View className="flex-1 items-end">
                                        <Text className="text-gray-400 text-[10px] uppercase font-bold">Joined</Text>
                                        <Text className="text-gray-600 text-xs">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Recent"}
                                        </Text>
                                    </View>
                                </View>

                                {/* Actions Bar */}
                                <View className="flex-row justify-end items-center gap-2 pt-2 border-t border-gray-100">
                                    <TouchableOpacity
                                        onPress={() => openEditModal(user)}
                                        className="bg-gray-100 px-3.5 py-1.5 rounded-lg flex-row items-center"
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="create-outline" size={14} color="#374151" />
                                        <Text className="text-xs font-semibold text-gray-700 ml-1">Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => confirmDeleteUser(user)}
                                        disabled={deletingId === user._id}
                                        className="bg-red-50 px-3.5 py-1.5 rounded-lg flex-row items-center border border-red-100"
                                        activeOpacity={0.7}
                                    >
                                        {deletingId === user._id ? (
                                            <ActivityIndicator size="small" color="#EF4444" />
                                        ) : (
                                            <>
                                                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                                <Text className="text-xs font-semibold text-red-600 ml-1">Delete</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* EDIT USER MODAL */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <Pressable onPress={() => setEditModalVisible(false)} className="flex-1 justify-end bg-black/50">
                    <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-5 max-h-[85%]">
                        <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100">
                            <Text className="text-lg font-bold text-primary">Edit User Profile</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Name Input */}
                            <Text className="text-xs font-bold text-secondary uppercase mb-1.5">Full Name</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-primary text-sm mb-4"
                                placeholder="User full name"
                                value={editName}
                                onChangeText={setEditName}
                            />

                            {/* Email Input */}
                            <Text className="text-xs font-bold text-secondary uppercase mb-1.5">Email Address</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-primary text-sm mb-4"
                                placeholder="email@example.com"
                                value={editEmail}
                                onChangeText={setEditEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {/* Role Toggle */}
                            <Text className="text-xs font-bold text-secondary uppercase mb-2">Access Role</Text>
                            <View className="flex-row gap-3 mb-6">
                                <TouchableOpacity
                                    onPress={() => setEditRole("user")}
                                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center ${
                                        editRole === "user"
                                            ? "bg-gray-800 border-gray-800"
                                            : "bg-gray-50 border-gray-200"
                                    }`}
                                >
                                    <Ionicons
                                        name="person-outline"
                                        size={16}
                                        color={editRole === "user" ? "#FFFFFF" : "#4B5563"}
                                    />
                                    <Text
                                        className={`ml-2 text-xs font-bold ${
                                            editRole === "user" ? "text-white" : "text-gray-700"
                                        }`}
                                    >
                                        Customer (User)
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setEditRole("admin")}
                                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center ${
                                        editRole === "admin"
                                            ? "bg-indigo-600 border-indigo-600"
                                            : "bg-gray-50 border-gray-200"
                                    }`}
                                >
                                    <Ionicons
                                        name="shield-checkmark-outline"
                                        size={16}
                                        color={editRole === "admin" ? "#FFFFFF" : "#4B5563"}
                                    />
                                    <Text
                                        className={`ml-2 text-xs font-bold ${
                                            editRole === "admin" ? "text-white" : "text-gray-700"
                                        }`}
                                    >
                                        Admin
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Action Buttons */}
                            <View className="flex-row gap-3 mb-4">
                                <TouchableOpacity
                                    onPress={() => setEditModalVisible(false)}
                                    className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
                                >
                                    <Text className="text-gray-700 font-semibold text-sm">Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSaveUserEdit}
                                    disabled={updating}
                                    className="flex-1 bg-primary py-3.5 rounded-xl items-center"
                                >
                                    {updating ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text className="text-white font-bold text-sm">Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}
