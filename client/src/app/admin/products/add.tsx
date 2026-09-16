import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View, Switch, Image, ActivityIndicator, Modal, FlatList, Pressable, Platform, } from "react-native";
import Toast from 'react-native-toast-message';
import { COLORS } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { CATEGORIES } from "@/constants";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import api from "@/constants/api";

export default function AddProduct() {

    const router = useRouter();
    const { getToken } = useAuth();

    const [submitting, setSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [category, setCategory] = useState("Men");
    const [sizes, setSizes] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);

    // PICK MULTIPLE IMAGES (MAX 5)
    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.8,
        });

        if (!result.canceled) {
            const uris = result.assets.map((asset) => asset.uri);
            setImages(uris.slice(0, 5));
        }
    };

    // Add Product
    const handleSubmit = async () => {
        if (!name || !price || !category || sizes.length < 1) {
            Toast.show({
                type: 'error',
                text1: 'Missing Fields',
                text2: 'Please fill in all required fields'
            });
            return;
        }

        if (images.length === 0) {
            Toast.show({
                type: 'error',
                text1: 'Missing Image',
                text2: 'Please upload at least one image'
            });
            return;
        }

        try {
            setSubmitting(true);
            const token = await getToken();
            const formData = new FormData();

            // Basic fields
            formData.append('name', name);
            formData.append('description', description);
            formData.append('price', price);
            formData.append('stock', stock || '0');
            formData.append('category', category);
            formData.append('isFeatured', String(isFeatured));
            formData.append('sizes', sizes);

            // Images
            for (const [i, uri] of images.entries()) {
                const filename = `image_${i + 1}.jpg`;
                if (Platform.OS === 'web') {
                    const blob = await (await fetch(uri)).blob();
                    formData.append('images', new File([blob], filename, { type: 'image/jpeg' }));
                } else {
                    formData.append('images', {
                        uri: uri,
                        type: 'image/jpeg',
                        name: filename
                    } as any);
                }
            }

            // Call API: POST /products
            await api.post('/products', formData, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            // Success
            Toast.show({
                type: 'success',
                text1: 'Product Added',
                text2: 'Product added successfully'
            });
            router.back();

        } catch (error: any) {
            console.error('Failed to add product:', error);
            Toast.show({
                type: 'error',
                text1: 'Product Error',
                text2: error.response?.data?.message || 'Failed to add product'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-surface p-4">
            <View className="bg-white p-4 rounded-xl shadow-sm mb-20">
                {/* NAME */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Product Name *
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    placeholder="e.g. Wireless Headphones"
                    value={name}
                    onChangeText={setName}
                />

                {/* PRICE */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Price ($) *
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                />

                {/* CATEGORY */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Category
                </Text>
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="bg-surface p-3 rounded-lg mb-4 flex-row justify-between items-center"
                >
                    <Text className="text-primary">{category}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                </TouchableOpacity>

                {/* CATEGORY MODAL */}
                <Modal visible={modalVisible} animationType="slide" transparent>
                    <Pressable onPress={() => setModalVisible(false)} className="flex-1 justify-end bg-black/50">
                        <View className="bg-white rounded-t-2xl p-4 max-h-[50%]">
                            <Text className="text-lg font-bold text-center mb-4">
                                Select Category
                            </Text>

                            <FlatList
                                data={CATEGORIES}
                                keyExtractor={(item) => String(item.id)}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        className={`p-4 border-b ${category === item.name ? "bg-primary/5" : ""}`}
                                        onPress={() => {
                                            setCategory(item.name);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <View className="flex-row justify-between">
                                            <Text className={`${category === item.name ? "font-bold text-primary" : ""}`}>
                                                {item.name}
                                            </Text>
                                            {category === item.name && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={COLORS.primary}
                                                />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </Pressable>
                </Modal>

                {/* STOCK */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Stock Level
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    placeholder="0"
                    keyboardType="number-pad"
                    value={stock}
                    onChangeText={setStock}
                />

                {/* SIZES */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Sizes (comma separated)
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    placeholder="e.g. S, M, L, XL"
                    value={sizes}
                    onChangeText={setSizes}
                />

                {/* IMAGE PICKER */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Product Images (max 5)
                </Text>

                <TouchableOpacity onPress={pickImages} className="mb-4">
                    {images.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {images.map((uri, i) => (
                                <Image
                                    key={i}
                                    source={{ uri }}
                                    className="w-32 h-32 rounded-lg mr-2"
                                />
                            ))}
                        </ScrollView>
                    ) : (
                        <View className="w-full h-32 rounded-lg bg-gray-100 justify-center items-center border border-dashed border-gray-300">
                            <Ionicons
                                name="cloud-upload-outline"
                                size={32}
                                color={COLORS.secondary}
                            />
                            <Text className="text-secondary text-xs mt-2">
                                Tap to upload images
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* DESCRIPTION */}
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Description
                </Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-6 text-primary h-24"
                    multiline
                    value={description}
                    onChangeText={setDescription}
                />

                {/* FEATURED */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-primary font-bold">Featured Product</Text>
                    <Switch
                        value={isFeatured}
                        onValueChange={setIsFeatured}
                        trackColor={{ false: "#eee", true: COLORS.primary }}
                    />
                </View>

                {/* SUBMIT */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    className={`bg-primary p-4 rounded-xl items-center ${submitting ? "opacity-70" : ""}`}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">
                            Create Product
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
