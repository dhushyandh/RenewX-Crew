import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import * as Location from "expo-location";

import { COLORS } from "@/constants";
import api, { getAuthHeaders } from "@/constants/api";

type AddressType = "home" | "office" | "other";

export type ShippingAddress = {
    id: string;
    title: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
    type: AddressType;
};

type AddressForm = {
    title: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
    type: AddressType;
};

const EMPTY_FORM: AddressForm = {
    title: "Home",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    isDefault: false,
    type: "home",
};

export default function AddressesScreen() {
    const router = useRouter();
    const { isLoaded, isSignedIn, user } = useUser();

    const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingAddress, setEditingAddress] =
        useState<ShippingAddress | null>(null);

    const [form, setForm] = useState<AddressForm>(EMPTY_FORM);

    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);

    const userId = user?.id;

    const { getToken } = useAuth();

    const normalizeAddress = useCallback((item: any): ShippingAddress => ({
        id: String(item._id ?? item.id),
        title: item.type === "Work" ? "Office" : item.type ?? "Home",
        street: item.street ?? "",
        city: item.city ?? "",
        state: item.state ?? "",
        pincode: item.zipCode ?? item.pincode ?? "",
        country: item.country ?? "India",
        isDefault: item.isDefault === true,
        type: item.type === "Work" ? "office" : item.type === "Other" ? "other" : "home",
    }), []);

    const loadAddresses = useCallback(async () => {
        if (!userId || !isSignedIn) {
            setAddresses([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const authConfig = await getAuthHeaders(getToken);
            const response = await api.get("/addresses", authConfig);
            const serverAddresses = Array.isArray(response.data?.data)
                ? response.data.data.map(normalizeAddress)
                : [];
            setAddresses(serverAddresses);
        } catch (error) {
            console.error("Failed to load addresses:", error);
            Alert.alert("Unable to load addresses", "We couldn't load your saved addresses. Please try again.");
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    }, [userId, isSignedIn, getToken, normalizeAddress]);

    useEffect(() => {
        loadAddresses();
    }, [loadAddresses]);

    const openAddModal = useCallback(() => {
        setEditingAddress(null);

        setForm({
            ...EMPTY_FORM,
            isDefault: addresses.length === 0,
        });

        setModalVisible(true);
    }, [addresses.length]);

    const openEditModal = useCallback(
        (address: ShippingAddress) => {
            setEditingAddress(address);

            setForm({
                title: address.title,
                street: address.street,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                country: address.country,
                isDefault: address.isDefault,
                type: address.type,
            });

            setModalVisible(true);
        },
        []
    );

    const closeModal = useCallback(() => {
        if (saving || locating) return;

        setModalVisible(false);
        setEditingAddress(null);
        setForm(EMPTY_FORM);
    }, [saving, locating]);

    const updateField = useCallback(
        (field: keyof AddressForm, value: string | boolean) => {
            setForm((previous) => ({
                ...previous,
                [field]: value,
            }));
        },
        []
    );

    const validateForm = useCallback(() => {
        if (!form.street.trim()) {
            Alert.alert(
                "Street required",
                "Please enter your flat, house, building or street."
            );
            return false;
        }

        if (!form.city.trim()) {
            Alert.alert(
                "City required",
                "Please enter your city."
            );
            return false;
        }

        if (!form.state.trim()) {
            Alert.alert(
                "State required",
                "Please enter your state."
            );
            return false;
        }

        if (!/^[0-9]{6}$/.test(form.pincode.trim())) {
            Alert.alert(
                "Invalid PIN code",
                "Please enter a valid 6-digit PIN code."
            );
            return false;
        }

        return true;
    }, [form]);

    const saveAddress = useCallback(async () => {
        if (!userId) {
            Alert.alert("Sign in required", "Please sign in before adding a shipping address.");
            router.push("/sign-in");
            return;
        }
        if (!validateForm()) return;

        try {
            setSaving(true);
            const authConfig = await getAuthHeaders(getToken);
            const payload = {
                type: form.type === "office" ? "Work" : form.type === "other" ? "Other" : "Home",
                street: form.street.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                zipCode: form.pincode.trim(),
                country: form.country.trim() || "India",
                isDefault: form.isDefault || addresses.length === 0,
            };

            const response = editingAddress
                ? await api.put(`/addresses/${editingAddress.id}`, payload, authConfig)
                : await api.post("/addresses", payload, authConfig);

            if (!response.data?.success || !response.data?.data) {
                throw new Error("Invalid address response");
            }

            await loadAddresses();
            setModalVisible(false);
            setEditingAddress(null);
            setForm(EMPTY_FORM);
            Alert.alert("Address saved", editingAddress ? "Your address has been updated." : "Your address has been added successfully.");
        } catch (error: any) {
            console.error("Save address error:", error);
            const message = error?.response?.data?.message || "Something went wrong while saving your address.";
            Alert.alert("Unable to save", message);
        } finally {
            setSaving(false);
        }
    }, [userId, router, validateForm, form, addresses.length, editingAddress, getToken, loadAddresses]);

    const useCurrentLocation = useCallback(async () => {
        if (!userId) {
            Alert.alert(
                "Sign in required",
                "Please sign in before saving an address."
            );
            router.push("/sign-in");
            return;
        }

        try {
            setLocating(true);

            const { status } =
                await Location.requestForegroundPermissionsAsync();

            if (
                status !==
                Location.PermissionStatus.GRANTED
            ) {
                Alert.alert(
                    "Location permission required",
                    "Allow location access to automatically fill your delivery address."
                );
                return;
            }

            const currentLocation =
                await Location.getCurrentPositionAsync({
                    accuracy:
                        Location.Accuracy.Balanced,
                });

            const { latitude, longitude } =
                currentLocation.coords;

            const result =
                await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                });

            const address = result[0];

            if (!address) {
                throw new Error(
                    "No address could be determined."
                );
            }

            const street = [
                address.name,
                address.street,
            ]
                .filter(Boolean)
                .join(", ");

            setForm((previous) => ({
                ...previous,
                street:
                    street ||
                    address.district ||
                    "",
                city:
                    address.city ||
                    address.district ||
                    address.subregion ||
                    "",
                state:
                    address.region ||
                    "",
                pincode:
                    address.postalCode ||
                    "",
                country:
                    address.country ||
                    "India",
            }));

            Alert.alert(
                "Location detected",
                "We've filled the address from your current location. Please verify it before saving."
            );
        } catch (error) {
            console.error(
                "Location detection error:",
                error
            );

            Alert.alert(
                "Location unavailable",
                "We couldn't detect your address. Please enter it manually."
            );
        } finally {
            setLocating(false);
        }
    }, [userId, router]);

    const deleteAddress = useCallback((address: ShippingAddress) => {
        Alert.alert("Delete address?", `Remove "${address.title}" from your saved addresses?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        const authConfig = await getAuthHeaders(getToken);
                        await api.delete(`/addresses/${address.id}`, authConfig);
                        await loadAddresses();
                    } catch (error: any) {
                        console.error("Delete address error:", error);
                        Alert.alert("Unable to delete", error?.response?.data?.message || "Please try again.");
                    }
                },
            },
        ]);
    }, [getToken, loadAddresses]);

    const makeDefault = useCallback(async (address: ShippingAddress) => {
        try {
            const authConfig = await getAuthHeaders(getToken);
            await api.put(`/addresses/${address.id}`, {
                type: address.type === "office" ? "Work" : address.type === "other" ? "Other" : "Home",
                street: address.street,
                city: address.city,
                state: address.state,
                zipCode: address.pincode,
                country: address.country,
                isDefault: true,
            }, authConfig);
            await loadAddresses();
        } catch (error: any) {
            console.error("Default address error:", error);
            Alert.alert("Unable to update default address", error?.response?.data?.message || "Please try again.");
        }
    }, [getToken, loadAddresses]);

    if (!isLoaded) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator
                        size="small"
                        color={COLORS.primary}
                    />
                    <Text style={styles.loadingText}>
                        Loading addresses...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!isSignedIn || !user) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <Header
                        onBack={() => router.back()}
                    />

                    <View style={styles.center}>
                        <View style={styles.emptyIcon}>
                            <Ionicons
                                name="location-outline"
                                size={34}
                                color={COLORS.primary}
                            />
                        </View>

                        <Text style={styles.emptyTitle}>
                            Sign in to manage addresses
                        </Text>

                        <Text
                            style={
                                styles.emptyDescription
                            }
                        >
                            Save your delivery addresses
                            for faster checkout.
                        </Text>

                        <Pressable
                            onPress={() =>
                                router.push(
                                    "/sign-in"
                                )
                            }
                            style={
                                styles.primaryButton
                            }
                        >
                            <Text
                                style={
                                    styles.primaryButtonText
                                }
                            >
                                Sign In
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={18}
                                color="#FFFFFF"
                            />
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top", "bottom"]}
        >
            <View style={styles.container}>
                <Header
                    onBack={() => router.back()}
                    onAdd={openAddModal}
                />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.introCard}>
                        <View style={styles.introIcon}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={23}
                                color={COLORS.primary}
                            />
                        </View>

                        <View
                            style={
                                styles.introContent
                            }
                        >
                            <Text
                                style={
                                    styles.introTitle
                                }
                            >
                                Your delivery addresses
                            </Text>

                            <Text
                                style={
                                    styles.introText
                                }
                            >
                                Add an address manually or
                                use your current location.
                            </Text>
                        </View>
                    </View>

                    {loading ? (
                        <View
                            style={
                                styles.loadingBox
                            }
                        >
                            <ActivityIndicator
                                size="small"
                                color={
                                    COLORS.primary
                                }
                            />
                        </View>
                    ) : addresses.length === 0 ? (
                        <EmptyAddress
                            onAdd={
                                openAddModal
                            }
                            onLocation={() => {
                                setEditingAddress(
                                    null
                                );
                                setForm({
                                    ...EMPTY_FORM,
                                    isDefault: true,
                                });
                                setModalVisible(
                                    true
                                );
                            }}
                        />
                    ) : (
                        <>
                            {defaultAddress && (
                                <View
                                    style={
                                        styles.section
                                    }
                                >
                                    <Text
                                        style={
                                            styles.sectionTitle
                                        }
                                    >
                                        Default address
                                    </Text>

                                    <Text
                                        style={
                                            styles.sectionSubtitle
                                        }
                                    >
                                        Automatically selected
                                        during checkout
                                    </Text>

                                    <AddressCard
                                        address={
                                            defaultAddress
                                        }
                                        onEdit={() =>
                                            openEditModal(
                                                defaultAddress
                                            )
                                        }
                                        onDelete={() =>
                                            deleteAddress(
                                                defaultAddress
                                            )
                                        }
                                        onDefault={() =>
                                            makeDefault(
                                                defaultAddress
                                            )
                                        }
                                    />
                                </View>
                            )}

                            <View
                                style={
                                    styles.section
                                }
                            >
                                <Text
                                    style={
                                        styles.sectionTitle
                                    }
                                >
                                    Saved addresses
                                </Text>

                                <Text
                                    style={
                                        styles.sectionSubtitle
                                    }
                                >
                                    {addresses.length}{" "}
                                    {addresses.length ===
                                        1
                                        ? "address"
                                        : "addresses"}
                                </Text>

                                {addresses
                                    .filter(
                                        (address) =>
                                            !defaultAddress ||
                                            address.id !==
                                            defaultAddress.id
                                    )
                                    .map(
                                        (
                                            address
                                        ) => (
                                            <AddressCard
                                                key={
                                                    address.id
                                                }
                                                address={
                                                    address
                                                }
                                                onEdit={() =>
                                                    openEditModal(
                                                        address
                                                    )
                                                }
                                                onDelete={() =>
                                                    deleteAddress(
                                                        address
                                                    )
                                                }
                                                onDefault={() =>
                                                    makeDefault(
                                                        address
                                                    )
                                                }
                                            />
                                        )
                                    )}
                            </View>
                        </>
                    )}

                    <Pressable
                        onPress={
                            openAddModal
                        }
                        style={
                            styles.addButton
                        }
                    >
                        <View
                            style={
                                styles.addButtonIcon
                            }
                        >
                            <Ionicons
                                name="add"
                                size={22}
                                color={
                                    COLORS.primary
                                }
                            />
                        </View>

                        <View
                            style={
                                styles.addButtonContent
                            }
                        >
                            <Text
                                style={
                                    styles.addButtonTitle
                                }
                            >
                                Add new address
                            </Text>

                            <Text
                                style={
                                    styles.addButtonSubtitle
                                }
                            >
                                Home, office or another
                                delivery location
                            </Text>
                        </View>

                        <Ionicons
                            name="chevron-forward"
                            size={19}
                            color="#999999"
                        />
                    </Pressable>

                    <View
                        style={
                            styles.bottomSpace
                        }
                    />
                </ScrollView>

                <AddressModal
                    visible={
                        modalVisible
                    }
                    form={form}
                    editing={
                        Boolean(
                            editingAddress
                        )
                    }
                    saving={
                        saving
                    }
                    locating={
                        locating
                    }
                    onClose={
                        closeModal
                    }
                    onChange={
                        updateField
                    }
                    onLocation={
                        useCurrentLocation
                    }
                    onSave={
                        saveAddress
                    }
                />
            </View>
        </SafeAreaView>
    );
}


// =============================================================================
// HEADER
// =============================================================================

function Header({
    onBack,
    onAdd,
}: {
    onBack: () => void;
    onAdd?: () => void;
}) {
    return (
        <View style={styles.header}>
            <Pressable
                onPress={onBack}
                style={styles.headerButton}
            >
                <Ionicons
                    name="arrow-back"
                    size={22}
                    color={COLORS.primary}
                />
            </Pressable>

            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>
                    Shipping Addresses
                </Text>

                <Text style={styles.headerSubtitle}>
                    Manage your delivery locations
                </Text>
            </View>

            {onAdd ? (
                <Pressable
                    onPress={onAdd}
                    style={styles.headerButton}
                >
                    <Ionicons
                        name="add"
                        size={25}
                        color={COLORS.primary}
                    />
                </Pressable>
            ) : (
                <View style={styles.headerButton} />
            )}
        </View>
    );
}


// =============================================================================
// EMPTY
// =============================================================================

function EmptyAddress({
    onAdd,
    onLocation,
}: {
    onAdd: () => void;
    onLocation: () => void;
}) {
    return (
        <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
                <Ionicons
                    name="location-outline"
                    size={32}
                    color={COLORS.primary}
                />
            </View>

            <Text style={styles.emptyTitle}>
                No delivery address
            </Text>

            <Text style={styles.emptyDescription}>
                Add your shipping address to make
                checkout quick and easy.
            </Text>

            <Pressable
                onPress={onAdd}
                style={styles.primaryButton}
            >
                <Ionicons
                    name="add"
                    size={19}
                    color="#FFFFFF"
                />

                <Text
                    style={
                        styles.primaryButtonText
                    }
                >
                    Add Address
                </Text>
            </Pressable>

            <Pressable
                onPress={onLocation}
                style={styles.secondaryButton}
            >
                <Ionicons
                    name="navigate-outline"
                    size={19}
                    color={COLORS.primary}
                />

                <Text
                    style={
                        styles.secondaryButtonText
                    }
                >
                    Use Current Location
                </Text>
            </Pressable>
        </View>
    );
}


// =============================================================================
// ADDRESS CARD
// =============================================================================

function AddressCard({
    address,
    onEdit,
    onDelete,
    onDefault,
}: {
    address: ShippingAddress;
    onEdit: () => void;
    onDelete: () => void;
    onDefault: () => void;
}) {
    const icon =
        address.type === "office"
            ? "business-outline"
            : address.type === "other"
                ? "location-outline"
                : "home-outline";

    return (
        <View style={styles.addressCard}>
            <View style={styles.addressTop}>
                <View style={styles.addressIcon}>
                    <Ionicons
                        name={icon}
                        size={21}
                        color={COLORS.primary}
                    />
                </View>

                <View style={styles.addressInfo}>
                    <View
                        style={
                            styles.addressTitleRow
                        }
                    >
                        <Text
                            style={
                                styles.addressTitle
                            }
                        >
                            {address.title}
                        </Text>

                        {address.isDefault && (
                            <View
                                style={
                                    styles.defaultBadge
                                }
                            >
                                <Text
                                    style={
                                        styles.defaultBadgeText
                                    }
                                >
                                    DEFAULT
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text
                        style={
                            styles.addressStreet
                        }
                    >
                        {address.street}
                    </Text>

                    <Text
                        style={
                            styles.addressLocation
                        }
                    >
                        {address.city},{" "}
                        {address.state}
                    </Text>

                    <Text
                        style={
                            styles.addressPin
                        }
                    >
                        {address.pincode} •{" "}
                        {address.country}
                    </Text>
                </View>
            </View>

            <View
                style={
                    styles.addressActions
                }
            >
                {!address.isDefault && (
                    <Pressable
                        onPress={
                            onDefault
                        }
                        style={
                            styles.action
                        }
                    >
                        <Ionicons
                            name="star-outline"
                            size={16}
                            color={
                                COLORS.primary
                            }
                        />

                        <Text
                            style={
                                styles.actionText
                            }
                        >
                            Default
                        </Text>
                    </Pressable>
                )}

                <Pressable
                    onPress={
                        onEdit
                    }
                    style={
                        styles.action
                    }
                >
                    <Ionicons
                        name="create-outline"
                        size={16}
                        color={
                            COLORS.primary
                        }
                    />

                    <Text
                        style={
                            styles.actionText
                        }
                    >
                        Edit
                    </Text>
                </Pressable>

                <Pressable
                    onPress={
                        onDelete
                    }
                    style={
                        styles.action
                    }
                >
                    <Ionicons
                        name="trash-outline"
                        size={16}
                        color={
                            COLORS.accent
                        }
                    />

                    <Text
                        style={[
                            styles.actionText,
                            {
                                color:
                                    COLORS.accent,
                            },
                        ]}
                    >
                        Delete
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}


// =============================================================================
// ADDRESS MODAL
// =============================================================================

function AddressModal({
    visible,
    form,
    editing,
    saving,
    locating,
    onClose,
    onChange,
    onLocation,
    onSave,
}: {
    visible: boolean;
    form: AddressForm;
    editing: boolean;
    saving: boolean;
    locating: boolean;
    onClose: () => void;
    onChange: (
        field: keyof AddressForm,
        value: string | boolean
    ) => void;
    onLocation: () => void;
    onSave: () => void;
}) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle={
                Platform.OS === "ios"
                    ? "pageSheet"
                    : "fullScreen"
            }
            onRequestClose={
                onClose
            }
        >
            <SafeAreaView
                style={
                    styles.modalSafeArea
                }
            >
                <KeyboardAvoidingView
                    style={
                        styles.modalContainer
                    }
                    behavior={
                        Platform.OS ===
                            "ios"
                            ? "padding"
                            : undefined
                    }
                >
                    <View
                        style={
                            styles.modalHeader
                        }
                    >
                        <Pressable
                            onPress={
                                onClose
                            }
                            disabled={
                                saving ||
                                locating
                            }
                            style={
                                styles.headerButton
                            }
                        >
                            <Ionicons
                                name="close"
                                size={24}
                                color={
                                    COLORS.primary
                                }
                            />
                        </Pressable>

                        <View
                            style={
                                styles.modalHeaderCenter
                            }
                        >
                            <Text
                                style={
                                    styles.modalTitle
                                }
                            >
                                {editing
                                    ? "Edit Address"
                                    : "Add Address"}
                            </Text>

                            <Text
                                style={
                                    styles.modalSubtitle
                                }
                            >
                                Delivery information
                            </Text>
                        </View>

                        <View
                            style={
                                styles.headerButton
                            }
                        />
                    </View>

                    <ScrollView
                        style={
                            styles.modalScroll
                        }
                        contentContainerStyle={
                            styles.modalContent
                        }
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={
                            false
                        }
                    >
                        <Pressable
                            onPress={
                                onLocation
                            }
                            disabled={
                                saving ||
                                locating
                            }
                            style={
                                styles.locationButton
                            }
                        >
                            <View
                                style={
                                    styles.locationIcon
                                }
                            >
                                {locating ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />
                                ) : (
                                    <Ionicons
                                        name="navigate"
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                )}
                            </View>

                            <View
                                style={
                                    styles.locationContent
                                }
                            >
                                <Text
                                    style={
                                        styles.locationTitle
                                    }
                                >
                                    {locating
                                        ? "Detecting location..."
                                        : "Use current location"}
                                </Text>

                                <Text
                                    style={
                                        styles.locationSubtitle
                                    }
                                >
                                    Automatically fill
                                    your address with GPS
                                </Text>
                            </View>

                            {!locating && (
                                <Ionicons
                                    name="chevron-forward"
                                    size={18}
                                    color="#777777"
                                />
                            )}
                        </Pressable>

                        <Field
                            label="Address label"
                            placeholder="Home"
                            value={
                                form.title
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "title",
                                    value
                                )
                            }
                        />

                        <Text
                            style={
                                styles.fieldLabel
                            }
                        >
                            Address type
                        </Text>

                        <View
                            style={
                                styles.typeRow
                            }
                        >
                            <TypeButton
                                label="Home"
                                icon="home-outline"
                                active={
                                    form.type ===
                                    "home"
                                }
                                onPress={() =>
                                    onChange(
                                        "type",
                                        "home"
                                    )
                                }
                            />

                            <TypeButton
                                label="Office"
                                icon="business-outline"
                                active={
                                    form.type ===
                                    "office"
                                }
                                onPress={() =>
                                    onChange(
                                        "type",
                                        "office"
                                    )
                                }
                            />

                            <TypeButton
                                label="Other"
                                icon="location-outline"
                                active={
                                    form.type ===
                                    "other"
                                }
                                onPress={() =>
                                    onChange(
                                        "type",
                                        "other"
                                    )
                                }
                            />
                        </View>

                        <Field
                            label="Street / Flat / Building"
                            placeholder="Flat 402, Green Glen Layout"
                            value={
                                form.street
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "street",
                                    value
                                )
                            }
                            multiline
                        />

                        <Field
                            label="City"
                            placeholder="Vellore"
                            value={
                                form.city
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "city",
                                    value
                                )
                            }
                        />

                        <Field
                            label="State"
                            placeholder="Tamil Nadu"
                            value={
                                form.state
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "state",
                                    value
                                )
                            }
                        />

                        <Field
                            label="PIN code"
                            placeholder="632001"
                            value={
                                form.pincode
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "pincode",
                                    value
                                        .replace(
                                            /[^0-9]/g,
                                            ""
                                        )
                                        .slice(
                                            0,
                                            6
                                        )
                                )
                            }
                            keyboardType="number-pad"
                            maxLength={6}
                        />

                        <Field
                            label="Country"
                            placeholder="India"
                            value={
                                form.country
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "country",
                                    value
                                )
                            }
                        />

                        <Pressable
                            onPress={() =>
                                onChange(
                                    "isDefault",
                                    !form.isDefault
                                )
                            }
                            style={
                                styles.defaultToggle
                            }
                        >
                            <View
                                style={[
                                    styles.checkbox,
                                    form.isDefault &&
                                    styles.checkboxActive,
                                ]}
                            >
                                {form.isDefault && (
                                    <Ionicons
                                        name="checkmark"
                                        size={15}
                                        color="#FFFFFF"
                                    />
                                )}
                            </View>

                            <View
                                style={
                                    styles.defaultContent
                                }
                            >
                                <Text
                                    style={
                                        styles.defaultTitle
                                    }
                                >
                                    Make this my default
                                </Text>

                                <Text
                                    style={
                                        styles.defaultSubtitle
                                    }
                                >
                                    Automatically select
                                    this address at checkout
                                </Text>
                            </View>
                        </Pressable>
                    </ScrollView>

                    <View
                        style={
                            styles.modalFooter
                        }
                    >
                        <Pressable
                            onPress={
                                onSave
                            }
                            disabled={
                                saving ||
                                locating
                            }
                            style={[
                                styles.saveButton,
                                (saving ||
                                    locating) &&
                                styles.buttonDisabled,
                            ]}
                        >
                            {saving ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#FFFFFF"
                                />
                            ) : (
                                <Ionicons
                                    name="checkmark"
                                    size={19}
                                    color="#FFFFFF"
                                />
                            )}

                            <Text
                                style={
                                    styles.saveButtonText
                                }
                            >
                                {saving
                                    ? "Saving..."
                                    : editing
                                        ? "Save Changes"
                                        : "Save Address"}
                            </Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}


// =============================================================================
// FIELD
// =============================================================================

function Field({
    label,
    placeholder,
    value,
    onChangeText,
    multiline,
    keyboardType,
    maxLength,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (value: string) => void;
    multiline?: boolean;
    keyboardType?: "default" | "number-pad";
    maxLength?: number;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>
                {label}
            </Text>

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#A0A0A0"
                multiline={multiline}
                keyboardType={keyboardType}
                maxLength={maxLength}
                autoCapitalize="sentences"
                textAlignVertical={
                    multiline
                        ? "top"
                        : "center"
                }
                style={[
                    styles.input,
                    multiline &&
                    styles.multilineInput,
                ]}
            />
        </View>
    );
}


// =============================================================================
// TYPE BUTTON
// =============================================================================

function TypeButton({
    label,
    icon,
    active,
    onPress,
}: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.typeButton,
                active &&
                styles.typeButtonActive,
            ]}
        >
            <Ionicons
                name={icon}
                size={18}
                color={
                    active
                        ? "#FFFFFF"
                        : COLORS.primary
                }
            />

            <Text
                style={[
                    styles.typeButtonText,
                    active &&
                    styles.typeButtonTextActive,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}


// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
    },

    loadingText: {
        marginTop: 10,
        fontSize: 12,
        color: COLORS.secondary,
    },

    header: {
        minHeight: 68,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },

    headerButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
    },

    headerCenter: {
        flex: 1,
        alignItems: "center",
    },

    headerTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: COLORS.primary,
    },

    headerSubtitle: {
        marginTop: 3,
        fontSize: 10,
        color: COLORS.secondary,
    },

    scroll: {
        flex: 1,
    },

    scrollContent: {
        width: "100%",
        maxWidth: 620,
        alignSelf: "center",
        paddingHorizontal: 18,
        paddingTop: 18,
    },

    introCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 24,
    },

    introIcon: {
        width: 43,
        height: 43,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
    },

    introContent: {
        flex: 1,
        marginLeft: 12,
    },

    introTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primary,
    },

    introText: {
        marginTop: 3,
        fontSize: 11,
        lineHeight: 16,
        color: COLORS.secondary,
    },

    section: {
        marginBottom: 25,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: COLORS.primary,
    },

    sectionSubtitle: {
        marginTop: 3,
        marginBottom: 11,
        fontSize: 11,
        color: COLORS.secondary,
    },

    loadingBox: {
        minHeight: 180,
        alignItems: "center",
        justifyContent: "center",
    },

    emptyCard: {
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 38,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
        marginBottom: 18,
    },

    emptyIcon: {
        width: 70,
        height: 70,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
        marginBottom: 15,
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: "800",
        textAlign: "center",
        color: COLORS.primary,
    },

    emptyDescription: {
        maxWidth: 340,
        marginTop: 8,
        marginBottom: 20,
        fontSize: 12,
        lineHeight: 18,
        textAlign: "center",
        color: COLORS.secondary,
    },

    primaryButton: {
        minHeight: 48,
        paddingHorizontal: 22,
        borderRadius: 15,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    primaryButtonText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    secondaryButton: {
        minHeight: 48,
        marginTop: 10,
        paddingHorizontal: 22,
        borderRadius: 15,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    secondaryButtonText: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primary,
    },

    addressCard: {
        marginBottom: 12,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
    },

    addressTop: {
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
    },

    addressIcon: {
        width: 43,
        height: 43,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
    },

    addressInfo: {
        flex: 1,
        marginLeft: 12,
    },

    addressTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },

    addressTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.primary,
    },

    defaultBadge: {
        marginLeft: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },

    defaultBadgeText: {
        fontSize: 8,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: 0.4,
    },

    addressStreet: {
        marginTop: 7,
        fontSize: 13,
        lineHeight: 19,
        color: "#333333",
    },

    addressLocation: {
        marginTop: 3,
        fontSize: 12,
        color: COLORS.secondary,
    },

    addressPin: {
        marginTop: 3,
        fontSize: 11,
        color: "#888888",
    },

    addressActions: {
        minHeight: 47,
        paddingHorizontal: 13,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 17,
    },

    action: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 8,
    },

    actionText: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.primary,
    },

    addButton: {
        minHeight: 76,
        paddingHorizontal: 15,
        borderRadius: 19,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#CCCCCC",
        flexDirection: "row",
        alignItems: "center",
    },

    addButtonIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
    },

    addButtonContent: {
        flex: 1,
        marginLeft: 12,
    },

    addButtonTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primary,
    },

    addButtonSubtitle: {
        marginTop: 3,
        fontSize: 10,
        color: COLORS.secondary,
    },

    bottomSpace: {
        height: 30,
    },

    modalSafeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    modalContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    modalHeader: {
        minHeight: 68,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },

    modalHeaderCenter: {
        flex: 1,
        alignItems: "center",
    },

    modalTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: COLORS.primary,
    },

    modalSubtitle: {
        marginTop: 3,
        fontSize: 10,
        color: COLORS.secondary,
    },

    modalScroll: {
        flex: 1,
    },

    modalContent: {
        width: "100%",
        maxWidth: 620,
        alignSelf: "center",
        padding: 18,
        paddingBottom: 30,
    },

    locationButton: {
        minHeight: 72,
        padding: 12,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 22,
    },

    locationIcon: {
        width: 43,
        height: 43,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },

    locationContent: {
        flex: 1,
        marginLeft: 11,
    },

    locationTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primary,
    },

    locationSubtitle: {
        marginTop: 3,
        fontSize: 10,
        lineHeight: 15,
        color: COLORS.secondary,
    },

    field: {
        marginBottom: 16,
    },

    fieldLabel: {
        marginBottom: 7,
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.primary,
    },

    input: {
        minHeight: 48,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
        fontSize: 13,
        color: COLORS.primary,
    },

    multilineInput: {
        minHeight: 88,
        paddingTop: 13,
    },

    typeRow: {
        flexDirection: "row",
        gap: 9,
        marginBottom: 20,
    },

    typeButton: {
        flex: 1,
        minHeight: 45,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 6,
    },

    typeButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },

    typeButtonText: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.primary,
    },

    typeButtonTextActive: {
        color: "#FFFFFF",
    },

    defaultToggle: {
        padding: 14,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        flexDirection: "row",
        alignItems: "center",
    },

    checkbox: {
        width: 23,
        height: 23,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: "#BBBBBB",
        alignItems: "center",
        justifyContent: "center",
    },

    checkboxActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },

    defaultContent: {
        flex: 1,
        marginLeft: 10,
    },

    defaultTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.primary,
    },

    defaultSubtitle: {
        marginTop: 3,
        fontSize: 10,
        lineHeight: 15,
        color: COLORS.secondary,
    },

    modalFooter: {
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: "#FFFFFF",
    },

    saveButton: {
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    saveButtonText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    buttonDisabled: {
        opacity: 0.55,
    },
})    const openAddModal = useCallback(() => {
        setEditingAddress(null);

        setForm({
            ...EMPTY_FORM,
            isDefault: addresses.length === 0,
        });

        setModalVisible(true);
    }, [addresses.length]);

    const openEditModal = useCallback(
        (address: ShippingAddress) => {
            setEditingAddress(address);

            setForm({
                title: address.title,
                street: address.street,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                country: address.country,
                isDefault: address.isDefault,
                type: address.type,
            });

            setModalVisible(true);
        },
        []
    );

    const closeModal = useCallback(() => {
        if (saving || locating) return;

        setModalVisible(false);
        setEditingAddress(null);
        setForm(EMPTY_FORM);
    }, [saving, locating]);

    const updateField = useCallback(
        (field: keyof AddressForm, value: string | boolean) => {
            setForm((previous) => ({
                ...previous,
                [field]: value,
            }));
        },
        []
    );

    const validateForm = useCallback(() => {
        if (!form.street.trim()) {
            Alert.alert(
                "Street required",
                "Please enter your flat, house, building or street."
            );
            return false;
        }

        if (!form.city.trim()) {
            Alert.alert(
                "City required",
                "Please enter your city."
            );
            return false;
        }

        if (!form.state.trim()) {
            Alert.alert(
                "State required",
                "Please enter your state."
            );
            return false;
        }

        if (!/^[0-9]{6}$/.test(form.pincode.trim())) {
            Alert.alert(
                "Invalid PIN code",
                "Please enter a valid 6-digit PIN code."
            );
            return false;
        }

        return true;
    }, [form]);

    const saveAddress = useCallback(async () => {
        if (!userId) {
            Alert.alert(
                "Sign in required",
                "Please sign in before adding a shipping address."
            );
            router.push("/sign-in");
            return;
        }

        if (!validateForm()) return;

        try {
            setSaving(true);

            const isMakingDefault =
                form.isDefault || addresses.length === 0;

            const newAddress: ShippingAddress = {
                id:
                    editingAddress?.id ??
                    createAddressId(),
                title:
                    form.title.trim() || "Home",
                street: form.street.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                pincode: form.pincode.trim(),
                country:
                    form.country.trim() || "India",
                isDefault: isMakingDefault,
                type: form.type,
            };

            let nextAddresses: ShippingAddress[];

            if (editingAddress) {
                nextAddresses = addresses.map((address) =>
                    address.id === editingAddress.id
                        ? newAddress
                        : isMakingDefault
                            ? {
                                ...address,
                                isDefault: false,
                            }
                            : address
                );
            } else {
                nextAddresses = isMakingDefault
                    ? [
                        ...addresses.map((address) => ({
                            ...address,
                            isDefault: false,
                        })),
                        newAddress,
                    ]
                    : [...addresses, newAddress];
            }

            await persistAddresses(nextAddresses);

            setModalVisible(false);
            setEditingAddress(null);
            setForm(EMPTY_FORM);

            Alert.alert(
                "Address saved",
                editingAddress
                    ? "Your address has been updated."
                    : "Your address has been added successfully."
            );
        } catch (error) {
            console.error("Save address error:", error);

            Alert.alert(
                "Unable to save",
                "Something went wrong while saving your address."
            );
        } finally {
            setSaving(false);
        }
    }, [
        userId,
        router,
        validateForm,
        form,
        addresses,
        editingAddress,
        persistAddresses,
    ]);

    const useCurrentLocation = useCallback(async () => {
        if (!userId) {
            Alert.alert(
                "Sign in required",
                "Please sign in before saving an address."
            );
            router.push("/sign-in");
            return;
        }

        try {
            setLocating(true);

            const { status } =
                await Location.requestForegroundPermissionsAsync();

            if (
                status !==
                Location.PermissionStatus.GRANTED
            ) {
                Alert.alert(
                    "Location permission required",
                    "Allow location access to automatically fill your delivery address."
                );
                return;
            }

            const currentLocation =
                await Location.getCurrentPositionAsync({
                    accuracy:
                        Location.Accuracy.Balanced,
                });

            const { latitude, longitude } =
                currentLocation.coords;

            const result =
                await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                });

            const address = result[0];

            if (!address) {
                throw new Error(
                    "No address could be determined."
                );
            }

            const street = [
                address.name,
                address.street,
            ]
                .filter(Boolean)
                .join(", ");

            setForm((previous) => ({
                ...previous,
                street:
                    street ||
                    address.district ||
                    "",
                city:
                    address.city ||
                    address.district ||
                    address.subregion ||
                    "",
                state:
                    address.region ||
                    "",
                pincode:
                    address.postalCode ||
                    "",
                country:
                    address.country ||
                    "India",
            }));

            Alert.alert(
                "Location detected",
                "We've filled the address from your current location. Please verify it before saving."
            );
        } catch (error) {
            console.error(
                "Location detection error:",
                error
            );

            Alert.alert(
                "Location unavailable",
                "We couldn't detect your address. Please enter it manually."
            );
        } finally {
            setLocating(false);
        }
    }, [userId, router]);

    const deleteAddress = useCallback(
        (address: ShippingAddress) => {
            Alert.alert(
                "Delete address?",
                `Remove "${address.title}" from your saved addresses?`,
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                let next =
                                    addresses.filter(
                                        (item) =>
                                            item.id !==
                                            address.id
                                    );

                                if (
                                    address.isDefault &&
                                    next.length > 0
                                ) {
                                    next = next.map(
                                        (item, index) => ({
                                            ...item,
                                            isDefault:
                                                index === 0,
                                        })
                                    );
                                }

                                await persistAddresses(
                                    next
                                );
                            } catch (error) {
                                console.error(
                                    "Delete address error:",
                                    error
                                );

                                Alert.alert(
                                    "Unable to delete",
                                    "Please try again."
                                );
                            }
                        },
                    },
                ]
            );
        },
        [addresses, persistAddresses]
    );

    const makeDefault = useCallback(
        async (address: ShippingAddress) => {
            const next = addresses.map((item) => ({
                ...item,
                isDefault:
                    item.id === address.id,
            }));

            try {
                await persistAddresses(next);
            } catch (error) {
                console.error(
                    "Default address error:",
                    error
                );
            }
        },
        [addresses, persistAddresses]
    );

    if (!isLoaded) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator
                        size="small"
                        color={COLORS.primary}
                    />
                    <Text style={styles.loadingText}>
                        Loading addresses...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!isSignedIn || !user) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <Header
                        onBack={() => router.back()}
                    />

                    <View style={styles.center}>
                        <View style={styles.emptyIcon}>
                            <Ionicons
                                name="location-outline"
                                size={34}
                                color={COLORS.primary}
                            />
                        </View>

                        <Text style={styles.emptyTitle}>
                            Sign in to manage addresses
                        </Text>

                        <Text
                            style={
                                styles.emptyDescription
                            }
                        >
                            Save your delivery addresses
                            for faster checkout.
                        </Text>

                        <Pressable
                            onPress={() =>
                                router.push(
                                    "/sign-in"
                                )
                            }
                            style={
                                styles.primaryButton
                            }
                        >
                            <Text
                                style={
                                    styles.primaryButtonText
                                }
                            >
                                Sign In
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={18}
                                color="#FFFFFF"
                            />
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top", "bottom"]}
        >
            <View style={styles.container}>
                <Header
                    onBack={() => router.back()}
                    onAdd={openAddModal}
                />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.introCard}>
                        <View style={styles.introIcon}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={23}
                                color={COLORS.primary}
                            />
                        </View>

                        <View
                            style={
                                styles.introContent
                            }
                        >
                            <Text
                                style={
                                    styles.introTitle
                                }
                            >
                                Your delivery addresses
                            </Text>

                            <Text
                                style={
                                    styles.introText
                                }
                            >
                                Add an address manually or
                                use your current location.
                            </Text>
                        </View>
                    </View>

                    {loading ? (
                        <View
                            style={
                                styles.loadingBox
                            }
                        >
                            <ActivityIndicator
                                size="small"
                                color={
                                    COLORS.primary
                                }
                            />
                        </View>
                    ) : addresses.length === 0 ? (
                        <EmptyAddress
                            onAdd={
                                openAddModal
                            }
                            onLocation={() => {
                                setEditingAddress(
                                    null
                                );
                                setForm({
                                    ...EMPTY_FORM,
                                    isDefault: true,
                                });
                                setModalVisible(
                                    true
                                );
                            }}
                        />
                    ) : (
                        <>
                            {defaultAddress && (
                                <View
                                    style={
                                        styles.section
                                    }
                                >
                                    <Text
                                        style={
                                            styles.sectionTitle
                                        }
                                    >
                                        Default address
                                    </Text>

                                    <Text
                                        style={
                                            styles.sectionSubtitle
                                        }
                                    >
                                        Automatically selected
                                        during checkout
                                    </Text>

                                    <AddressCard
                                        address={
                                            defaultAddress
                                        }
                                        onEdit={() =>
                                            openEditModal(
                                                defaultAddress
                                            )
                                        }
                                        onDelete={() =>
                                            deleteAddress(
                                                defaultAddress
                                            )
                                        }
                                        onDefault={() =>
                                            makeDefault(
                                                defaultAddress
                                            )
                                        }
                                    />
                                </View>
                            )}

                            <View
                                style={
                                    styles.section
                                }
                            >
                                <Text
                                    style={
                                        styles.sectionTitle
                                    }
                                >
                                    Saved addresses
                                </Text>

                                <Text
                                    style={
                                        styles.sectionSubtitle
                                    }
                                >
                                    {addresses.length}{" "}
                                    {addresses.length ===
                                        1
                                        ? "address"
                                        : "addresses"}
                                </Text>

                                {addresses
                                    .filter(
                                        (address) =>
                                            !defaultAddress ||
                                            address.id !==
                                            defaultAddress.id
                                    )
                                    .map(
                                        (
                                            address
                                        ) => (
                                            <AddressCard
                                                key={
                                                    address.id
                                                }
                                                address={
                                                    address
                                                }
                                                onEdit={() =>
                                                    openEditModal(
                                                        address
                                                    )
                                                }
                                                onDelete={() =>
                                                    deleteAddress(
                                                        address
                                                    )
                                                }
                                                onDefault={() =>
                                                    makeDefault(
                                                        address
                                                    )
                                                }
                                            />
                                        )
                                    )}
                            </View>
                        </>
                    )}

                    <Pressable
                        onPress={
                            openAddModal
                        }
                        style={
                            styles.addButton
                        }
                    >
                        <View
                            style={
                                styles.addButtonIcon
                            }
                        >
                            <Ionicons
                                name="add"
                                size={22}
                                color={
                                    COLORS.primary
                                }
                            />
                        </View>

                        <View
                            style={
                                styles.addButtonContent
                            }
                        >
                            <Text
                                style={
                                    styles.addButtonTitle
                                }
                            >
                                Add new address
                            </Text>

                            <Text
                                style={
                                    styles.addButtonSubtitle
                                }
                            >
                                Home, office or another
                                delivery location
                            </Text>
                        </View>

                        <Ionicons
                            name="chevron-forward"
                            size={19}
                            color="#999999"
                        />
                    </Pressable>

                    <View
                        style={
                            styles.bottomSpace
                        }
                    />
                </ScrollView>

                <AddressModal
                    visible={
                        modalVisible
                    }
                    form={form}
                    editing={
                        Boolean(
                            editingAddress
                        )
                    }
                    saving={
                        saving
                    }
                    locating={
                        locating
                    }
                    onClose={
                        closeModal
                    }
                    onChange={
                        updateField
                    }
                    onLocation={
                        useCurrentLocation
                    }
                    onSave={
                        saveAddress
                    }
                />
            </View>
        </SafeAreaView>
    );
}


// =============================================================================
// HEADER
// =============================================================================

function Header({
    onBack,
    onAdd,
}: {
    onBack: () => void;
    onAdd?: () => void;
}) {
    return (
        <View style={styles.header}>
            <Pressable
                onPress={onBack}
                style={styles.headerButton}
            >
                <Ionicons
                    name="arrow-back"
                    size={22}
                    color={COLORS.primary}
                />
            </Pressable>

            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>
                    Shipping Addresses
                </Text>

                <Text style={styles.headerSubtitle}>
                    Manage your delivery locations
                </Text>
            </View>

            {onAdd ? (
                <Pressable
                    onPress={onAdd}
                    style={styles.headerButton}
                >
                    <Ionicons
                        name="add"
                        size={25}
                        color={COLORS.primary}
                    />
                </Pressable>
            ) : (
                <View style={styles.headerButton} />
            )}
        </View>
    );
}


// =============================================================================
// EMPTY
// =============================================================================

function EmptyAddress({
    onAdd,
    onLocation,
}: {
    onAdd: () => void;
    onLocation: () => void;
}) {
    return (
        <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
                <Ionicons
                    name="location-outline"
                    size={32}
                    color={COLORS.primary}
                />
            </View>

            <Text style={styles.emptyTitle}>
                No delivery address
            </Text>

            <Text style={styles.emptyDescription}>
                Add your shipping address to make
                checkout quick and easy.
            </Text>

            <Pressable
                onPress={onAdd}
                style={styles.primaryButton}
            >
                <Ionicons
                    name="add"
                    size={19}
                    color="#FFFFFF"
                />

                <Text
                    style={
                        styles.primaryButtonText
                    }
                >
                    Add Address
                </Text>
            </Pressable>

            <Pressable
                onPress={onLocation}
                style={styles.secondaryButton}
            >
                <Ionicons
                    name="navigate-outline"
                    size={19}
                    color={COLORS.primary}
                />

                <Text
                    style={
                        styles.secondaryButtonText
                    }
                >
                    Use Current Location
                </Text>
            </Pressable>
        </View>
    );
}


// =============================================================================
// ADDRESS CARD
// =============================================================================

function AddressCard({
    address,
    onEdit,
    onDelete,
    onDefault,
}: {
    address: ShippingAddress;
    onEdit: () => void;
    onDelete: () => void;
    onDefault: () => void;
}) {
    const icon =
        address.type === "office"
            ? "business-outline"
            : address.type === "other"
                ? "location-outline"
                : "home-outline";

    return (
        <View style={styles.addressCard}>
            <View style={styles.addressTop}>
                <View style={styles.addressIcon}>
                    <Ionicons
                        name={icon}
                        size={21}
                        color={COLORS.primary}
                    />
                </View>

                <View style={styles.addressInfo}>
                    <View
                        style={
                            styles.addressTitleRow
                        }
                    >
                        <Text
                            style={
                                styles.addressTitle
                            }
                        >
                            {address.title}
                        </Text>

                        {address.isDefault && (
                            <View
                                style={
                                    styles.defaultBadge
                                }
                            >
                                <Text
                                    style={
                                        styles.defaultBadgeText
                                    }
                                >
                                    DEFAULT
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text
                        style={
                            styles.addressStreet
                        }
                    >
                        {address.street}
                    </Text>

                    <Text
                        style={
                            styles.addressLocation
                        }
                    >
                        {address.city},{" "}
                        {address.state}
                    </Text>

                    <Text
                        style={
                            styles.addressPin
                        }
                    >
                        {address.pincode} •{" "}
                        {address.country}
                    </Text>
                </View>
            </View>

            <View
                style={
                    styles.addressActions
                }
            >
                {!address.isDefault && (
                    <Pressable
                        onPress={
                            onDefault
                        }
                        style={
                            styles.action
                        }
                    >
                        <Ionicons
                            name="star-outline"
                            size={16}
                            color={
                                COLORS.primary
                            }
                        />

                        <Text
                            style={
                                styles.actionText
                            }
                        >
                            Default
                        </Text>
                    </Pressable>
                )}

                <Pressable
                    onPress={
                        onEdit
                    }
                    style={
                        styles.action
                    }
                >
                    <Ionicons
                        name="create-outline"
                        size={16}
                        color={
                            COLORS.primary
                        }
                    />

                    <Text
                        style={
                            styles.actionText
                        }
                    >
                        Edit
                    </Text>
                </Pressable>

                <Pressable
                    onPress={
                        onDelete
                    }
                    style={
                        styles.action
                    }
                >
                    <Ionicons
                        name="trash-outline"
                        size={16}
                        color={
                            COLORS.accent
                        }
                    />

                    <Text
                        style={[
                            styles.actionText,
                            {
                                color:
                                    COLORS.accent,
                            },
                        ]}
                    >
                        Delete
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}


// =============================================================================
// ADDRESS MODAL
// =============================================================================

function AddressModal({
    visible,
    form,
    editing,
    saving,
    locating,
    onClose,
    onChange,
    onLocation,
    onSave,
}: {
    visible: boolean;
    form: AddressForm;
    editing: boolean;
    saving: boolean;
    locating: boolean;
    onClose: () => void;
    onChange: (
        field: keyof AddressForm,
        value: string | boolean
    ) => void;
    onLocation: () => void;
    onSave: () => void;
}) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle={
                Platform.OS === "ios"
                    ? "pageSheet"
                    : "fullScreen"
            }
            onRequestClose={
                onClose
            }
        >
            <SafeAreaView
                style={
                    styles.modalSafeArea
                }
            >
                <KeyboardAvoidingView
                    style={
                        styles.modalContainer
                    }
                    behavior={
                        Platform.OS ===
                            "ios"
                            ? "padding"
                            : undefined
                    }
                >
                    <View
                        style={
                            styles.modalHeader
                        }
                    >
                        <Pressable
                            onPress={
                                onClose
                            }
                            disabled={
                                saving ||
                                locating
                            }
                            style={
                                styles.headerButton
                            }
                        >
                            <Ionicons
                                name="close"
                                size={24}
                                color={
                                    COLORS.primary
                                }
                            />
                        </Pressable>

                        <View
                            style={
                                styles.modalHeaderCenter
                            }
                        >
                            <Text
                                style={
                                    styles.modalTitle
                                }
                            >
                                {editing
                                    ? "Edit Address"
                                    : "Add Address"}
                            </Text>

                            <Text
                                style={
                                    styles.modalSubtitle
                                }
                            >
                                Delivery information
                            </Text>
                        </View>

                        <View
                            style={
                                styles.headerButton
                            }
                        />
                    </View>

                    <ScrollView
                        style={
                            styles.modalScroll
                        }
                        contentContainerStyle={
                            styles.modalContent
                        }
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={
                            false
                        }
                    >
                        <Pressable
                            onPress={
                                onLocation
                            }
                            disabled={
                                saving ||
                                locating
                            }
                            style={
                                styles.locationButton
                            }
                        >
                            <View
                                style={
                                    styles.locationIcon
                                }
                            >
                                {locating ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />
                                ) : (
                                    <Ionicons
                                        name="navigate"
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                )}
                            </View>

                            <View
                                style={
                                    styles.locationContent
                                }
                            >
                                <Text
                                    style={
                                        styles.locationTitle
                                    }
                                >
                                    {locating
                                        ? "Detecting location..."
                                        : "Use current location"}
                                </Text>

                                <Text
                                    style={
                                        styles.locationSubtitle
                                    }
                                >
                                    Automatically fill
                                    your address with GPS
                                </Text>
                            </View>

                            {!locating && (
                                <Ionicons
                                    name="chevron-forward"
                                    size={18}
                                    color="#777777"
                                />
                            )}
                        </Pressable>

                        <Field
                            label="Address label"
                            placeholder="Home"
                            value={
                                form.title
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "title",
                                    value
                                )
                            }
                        />

                        <Text
                            style={
                                styles.fieldLabel
                            }
                        >
                            Address type
                        </Text>

                        <View
                            style={
                                styles.typeRow
                            }
                        >
                            <TypeButton
                                label="Home"
                                icon="home-outline"
                                active={
                                    form.type ===
                                    "home"
                                }
                                onPress={() =>
                                    onChange(
                                        "type",
                                        "home"
                                    )
                                }
                            />

                            <TypeButton
                                label="Office"
                                icon="business-outline"
                                active={
                                    form.type ===
                                    "office"
                                }
                                onPress={() =>
                                    onChange(
                                        "type",
                                        "office"
                                    )
                                }
                            />

                            <TypeButton
                                label="Other"
                                icon="location-outline"
                                active={
                                    form.type ===
                                    "other"
                                }
                                onPress={() =>
                                    onChange(
                                        "type",
                                        "other"
                                    )
                                }
                            />
                        </View>

                        <Field
                            label="Street / Flat / Building"
                            placeholder="Flat 402, Green Glen Layout"
                            value={
                                form.street
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "street",
                                    value
                                )
                            }
                            multiline
                        />

                        <Field
                            label="City"
                            placeholder="Vellore"
                            value={
                                form.city
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "city",
                                    value
                                )
                            }
                        />

                        <Field
                            label="State"
                            placeholder="Tamil Nadu"
                            value={
                                form.state
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "state",
                                    value
                                )
                            }
                        />

                        <Field
                            label="PIN code"
                            placeholder="632001"
                            value={
                                form.pincode
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "pincode",
                                    value
                                        .replace(
                                            /[^0-9]/g,
                                            ""
                                        )
                                        .slice(
                                            0,
                                            6
                                        )
                                )
                            }
                            keyboardType="number-pad"
                            maxLength={6}
                        />

                        <Field
                            label="Country"
                            placeholder="India"
                            value={
                                form.country
                            }
                            onChangeText={(value) =>
                                onChange(
                                    "country",
                                    value
                                )
                            }
                        />

                        <Pressable
                            onPress={() =>
                                onChange(
                                    "isDefault",
                                    !form.isDefault
                                )
                            }
                            style={
                                styles.defaultToggle
                            }
                        >
                            <View
                                style={[
                                    styles.checkbox,
                                    form.isDefault &&
                                    styles.checkboxActive,
                                ]}
                            >
                                {form.isDefault && (
                                    <Ionicons
                                        name="checkmark"
                                        size={15}
                                        color="#FFFFFF"
                                    />
                                )}
                            </View>

                            <View
                                style={
                                    styles.defaultContent
                                }
                            >
                                <Text
                                    style={
                                        styles.defaultTitle
                                    }
                                >
                                    Make this my default
                                </Text>

                                <Text
                                    style={
                                        styles.defaultSubtitle
                                    }
                                >
                                    Automatically select
                                    this address at checkout
                                </Text>
                            </View>
                        </Pressable>
                    </ScrollView>

                    <View
                        style={
                            styles.modalFooter
                        }
                    >
                        <Pressable
                            onPress={
                                onSave
                            }
                            disabled={
                                saving ||
                                locating
                            }
                            style={[
                                styles.saveButton,
                                (saving ||
                                    locating) &&
                                styles.buttonDisabled,
                            ]}
                        >
                            {saving ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#FFFFFF"
                                />
                            ) : (
                                <Ionicons
                                    name="checkmark"
                                    size={19}
                                    color="#FFFFFF"
                                />
                            )}

                            <Text
                                style={
                                    styles.saveButtonText
                                }
                            >
                                {saving
                                    ? "Saving..."
                                    : editing
                                        ? "Save Changes"
                                        : "Save Address"}
                            </Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}


// =============================================================================
// FIELD
// =============================================================================

function Field({
    label,
    placeholder,
    value,
    onChangeText,
    multiline,
    keyboardType,
    maxLength,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (value: string) => void;
    multiline?: boolean;
    keyboardType?: "default" | "number-pad";
    maxLength?: number;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>
                {label}
            </Text>

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#A0A0A0"
                multiline={multiline}
                keyboardType={keyboardType}
                maxLength={maxLength}
                autoCapitalize="sentences"
                textAlignVertical={
                    multiline
                        ? "top"
                        : "center"
                }
                style={[
                    styles.input,
                    multiline &&
                    styles.multilineInput,
                ]}
            />
        </View>
    );
}


// =============================================================================
// TYPE BUTTON
// =============================================================================

function TypeButton({
    label,
    icon,
    active,
    onPress,
}: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.typeButton,
                active &&
                styles.typeButtonActive,
            ]}
        >
            <Ionicons
                name={icon}
                size={18}
                color={
                    active
                        ? "#FFFFFF"
                        : COLORS.primary
                }
            />

            <Text
                style={[
                    styles.typeButtonText,
                    active &&
                    styles.typeButtonTextActive,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}


// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
    },

    loadingText: {
        marginTop: 10,
        fontSize: 12,
        color: COLORS.secondary,
    },

    header: {
        minHeight: 68,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },

    headerButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
    },

    headerCenter: {
        flex: 1,
        alignItems: "center",
    },

    headerTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: COLORS.primary,
    },

    headerSubtitle: {
        marginTop: 3,
        fontSize: 10,
        color: COLORS.secondary,
    },

    scroll: {
        flex: 1,
    },

    scrollContent: {
        width: "100%",
        maxWidth: 620,
        alignSelf: "center",
        paddingHorizontal: 18,
        paddingTop: 18,
    },

    introCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 24,
    },

    introIcon: {
        width: 43,
        height: 43,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
    },

    introContent: {
        flex: 1,
        marginLeft: 12,
    },

    introTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primary,
    },

    introText: {
        marginTop: 3,
        fontSize: 11,
        lineHeight: 16,
        color: COLORS.secondary,
    },

    section: {
        marginBottom: 25,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: COLORS.primary,
    },

    sectionSubtitle: {
        marginTop: 3,
        marginBottom: 11,
        fontSize: 11,
        color: COLORS.secondary,
    },

    loadingBox: {
        minHeight: 180,
        alignItems: "center",
        justifyContent: "center",
    },

    emptyCard: {
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 38,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
        marginBottom: 18,
    },

    emptyIcon: {
        width: 70,
        height: 70,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
        marginBottom: 15,
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: "800",
        textAlign: "center",
        color: COLORS.primary,
    },

    emptyDescription: {
        maxWidth: 340,
        marginTop: 8,
        marginBottom: 20,
        fontSize: 12,
        lineHeight: 18,
        textAlign: "center",
        color: COLORS.secondary,
    },

    primaryButton: {
        minHeight: 48,
        paddingHorizontal: 22,
        borderRadius: 15,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    primaryButtonText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    secondaryButton: {
        minHeight: 48,
        marginTop: 10,
        paddingHorizontal: 22,
        borderRadius: 15,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    secondaryButtonText: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primary,
    },

    addressCard: {
        marginBottom: 12,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
    },

    addressTop: {
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
    },

    addressIcon: {
        width: 43,
        height: 43,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
    },

    addressInfo: {
        flex: 1,
        marginLeft: 12,
    },

    addressTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },

    addressTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.primary,
    },

    defaultBadge: {
        marginLeft: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },

    defaultBadgeText: {
        fontSize: 8,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: 0.4,
    },

    addressStreet: {
        marginTop: 7,
        fontSize: 13,
        lineHeight: 19,
        color: "#333333",
    },

    addressLocation: {
        marginTop: 3,
        fontSize: 12,
        color: COLORS.secondary,
    },

    addressPin: {
        marginTop: 3,
        fontSize: 11,
        color: "#888888",
    },

    addressActions: {
        minHeight: 47,
        paddingHorizontal: 13,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 17,
    },

    action: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 8,
    },

    actionText: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.primary,
    },

    addButton: {
        minHeight: 76,
        paddingHorizontal: 15,
        borderRadius: 19,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#CCCCCC",
        flexDirection: "row",
        alignItems: "center",
    },

    addButtonIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
    },

    addButtonContent: {
        flex: 1,
        marginLeft: 12,
    },

    addButtonTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primary,
    },

    addButtonSubtitle: {
        marginTop: 3,
        fontSize: 10,
        color: COLORS.secondary,
    },

    bottomSpace: {
        height: 30,
    },

    modalSafeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    modalContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    modalHeader: {
        minHeight: 68,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },

    modalHeaderCenter: {
        flex: 1,
        alignItems: "center",
    },

    modalTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: COLORS.primary,
    },

    modalSubtitle: {
        marginTop: 3,
        fontSize: 10,
        color: COLORS.secondary,
    },

    modalScroll: {
        flex: 1,
    },

    modalContent: {
        width: "100%",
        maxWidth: 620,
        alignSelf: "center",
        padding: 18,
        paddingBottom: 30,
    },

    locationButton: {
        minHeight: 72,
        padding: 12,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 22,
    },

    locationIcon: {
        width: 43,
        height: 43,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },

    locationContent: {
        flex: 1,
        marginLeft: 11,
    },

    locationTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primary,
    },

    locationSubtitle: {
        marginTop: 3,
        fontSize: 10,
        lineHeight: 15,
        color: COLORS.secondary,
    },

    field: {
        marginBottom: 16,
    },

    fieldLabel: {
        marginBottom: 7,
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.primary,
    },

    input: {
        minHeight: 48,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
        fontSize: 13,
        color: COLORS.primary,
    },

    multilineInput: {
        minHeight: 88,
        paddingTop: 13,
    },

    typeRow: {
        flexDirection: "row",
        gap: 9,
        marginBottom: 20,
    },

    typeButton: {
        flex: 1,
        minHeight: 45,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 6,
    },

    typeButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },

    typeButtonText: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.primary,
    },

    typeButtonTextActive: {
        color: "#FFFFFF",
    },

    defaultToggle: {
        padding: 14,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        flexDirection: "row",
        alignItems: "center",
    },

    checkbox: {
        width: 23,
        height: 23,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: "#BBBBBB",
        alignItems: "center",
        justifyContent: "center",
    },

    checkboxActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },

    defaultContent: {
        flex: 1,
        marginLeft: 10,
    },

    defaultTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.primary,
    },

    defaultSubtitle: {
        marginTop: 3,
        fontSize: 10,
        lineHeight: 15,
        color: COLORS.secondary,
    },

    modalFooter: {
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: "#FFFFFF",
    },

    saveButton: {
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    saveButtonText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    buttonDisabled: {
        opacity: 0.55,
    },
});