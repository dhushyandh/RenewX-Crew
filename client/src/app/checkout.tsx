import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
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
import { useAuth } from "@clerk/expo";

import api, { getAuthHeaders } from "@/constants/api";

import { useCart } from "../../context/CartContext";

const COLORS = {
    background: "#F7F7F7",
    white: "#FFFFFF",
    black: "#111111",
    text: "#171717",
    secondary: "#707070",
    muted: "#999999",
    border: "#E7E7E7",
    soft: "#F2F2F3",
    accent: "#FF4C3B",
    success: "#258A55",
};

type PaymentMethod = "cod" | "card" | "upi";

export default function Checkout() {
    const router = useRouter();
    const { cartItems } = useCart();
    const { getToken } = useAuth();

    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [loadingSavedAddress, setLoadingSavedAddress] = useState(true);

    useEffect(() => {
        let mounted = true;
        const loadSavedAddresses = async () => {
            try {
                const authConfig = await getAuthHeaders(getToken);
                const response = await api.get("/addresses", authConfig);
                const items = Array.isArray(response.data?.data) ? response.data.data : [];
                if (!mounted) return;
                setSavedAddresses(items);
                const selected = items.find((item: any) => item.isDefault) ?? items[0];
                if (selected) {
                    setAddress(selected.street ?? "");
                    setCity(selected.city ?? "");
                    setState(selected.state ?? "");
                    setPincode(selected.zipCode ?? "");
                }
            } catch (error) {
                console.warn("Could not load saved addresses:", error);
            } finally {
                if (mounted) setLoadingSavedAddress(false);
            }
        };
        loadSavedAddresses();
        return () => { mounted = false; };
    }, [getToken]);

    const applySavedAddress = (selected: any) => {
        setAddress(selected.street ?? "");
        setCity(selected.city ?? "");
        setState(selected.state ?? "");
        setPincode(selected.zipCode ?? "");
    };

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [pincode, setPincode] = useState("");

    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>("cod");

    const [placingOrder, setPlacingOrder] =
        useState(false);

    const subtotal = useMemo(() => {
        return cartItems.reduce(
            (total, item) =>
                total +
                item.product.price * item.quantity,
            0,
        );
    }, [cartItems]);

    const totalItems = useMemo(() => {
        return cartItems.reduce(
            (total, item) => total + item.quantity,
            0,
        );
    }, [cartItems]);

    const shipping = subtotal >= 1000 ? 0 : 80;

    const total = subtotal + shipping;

    const validateForm = () => {
        if (!fullName.trim()) {
            Alert.alert(
                "Missing Information",
                "Please enter your full name.",
            );
            return false;
        }

        if (!phone.trim()) {
            Alert.alert(
                "Missing Information",
                "Please enter your phone number.",
            );
            return false;
        }

        if (phone.replace(/\D/g, "").length < 10) {
            Alert.alert(
                "Invalid Phone",
                "Please enter a valid 10-digit phone number.",
            );
            return false;
        }

        if (!address.trim()) {
            Alert.alert(
                "Missing Information",
                "Please enter your delivery address.",
            );
            return false;
        }

        if (!city.trim()) {
            Alert.alert(
                "Missing Information",
                "Please enter your city.",
            );
            return false;
        }

        if (!state.trim()) {
            Alert.alert(
                "Missing Information",
                "Please enter your state.",
            );
            return false;
        }

        if (!pincode.trim()) {
            Alert.alert(
                "Missing Information",
                "Please enter your PIN code.",
            );
            return false;
        }

        if (pincode.replace(/\D/g, "").length !== 6) {
            Alert.alert(
                "Invalid PIN Code",
                "Please enter a valid 6-digit PIN code.",
            );
            return false;
        }

        return true;
    };

    const handleContinueToReview = async () => {
        if (!validateForm()) {
            return;
        }

        if (cartItems.length === 0) {
            Alert.alert(
                "Cart Is Empty",
                "Add some products before continuing to checkout."
            );
            return;
        }

        setPlacingOrder(true);

        try {
            const checkoutData = {
                customer: {
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                },

                shippingAddress: {
                    address: address.trim(),
                    city: city.trim(),
                    state: state.trim(),
                    pincode: pincode.trim(),
                },

                paymentMethod,

                items: cartItems.map((item) => ({
                    productId: item.productId,
                    product: item.product,
                    size: item.size,
                    quantity: item.quantity,
                    price: item.product.price,
                })),

                pricing: {
                    subtotal,
                    shipping,
                    total,
                    totalItems,
                },

                createdAt: new Date().toISOString(),
            };

            /*
             * Pass the checkout information to the confirmation screen.
             *
             * JSON is encoded because Expo Router params
             * must be strings.
             */
            router.push({
                pathname: "/order/confirm" as any,
                params: {
                    checkoutData: JSON.stringify(
                        checkoutData
                    ),
                },
            });
        } catch (error) {
            console.error(
                "Checkout review error:",
                error
            );

            Alert.alert(
                "Unable to continue",
                "Something went wrong. Please try again."
            );
        } finally {
            setPlacingOrder(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <SafeAreaView
                style={styles.safeArea}
                edges={["top"]}
            >
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={COLORS.black}
                        />
                    </Pressable>

                    <Text style={styles.headerTitle}>
                        Checkout
                    </Text>

                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons
                            name="bag-outline"
                            size={42}
                            color={COLORS.black}
                        />
                    </View>

                    <Text style={styles.emptyTitle}>
                        Your Cart Is Empty
                    </Text>

                    <Text style={styles.emptySubtitle}>
                        Add products to your cart before
                        continuing to checkout.
                    </Text>

                    <Pressable
                        onPress={() => router.push("/shop")}
                        style={styles.shopButton}
                    >
                        <Text style={styles.shopButtonText}>
                            Continue Shopping
                        </Text>

                        <Ionicons
                            name="arrow-forward"
                            size={19}
                            color="#FFFFFF"
                        />
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top"]}
        >
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                {/* HEADER */}

                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={COLORS.black}
                        />
                    </Pressable>

                    <Text style={styles.headerTitle}>
                        Checkout
                    </Text>

                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* CHECKOUT STEPS */}

                    <View style={styles.stepBar}>
                        <View style={styles.stepActive}>
                            <View
                                style={
                                    styles.stepCircleActive
                                }
                            >
                                <Text
                                    style={
                                        styles.stepNumberActive
                                    }
                                >
                                    1
                                </Text>
                            </View>

                            <Text
                                style={styles.stepTextActive}
                            >
                                Delivery
                            </Text>
                        </View>

                        <View style={styles.stepLine} />

                        <View style={styles.step}>
                            <View
                                style={styles.stepCircle}
                            >
                                <Text
                                    style={
                                        styles.stepNumber
                                    }
                                >
                                    2
                                </Text>
                            </View>

                            <Text style={styles.stepText}>
                                Payment
                            </Text>
                        </View>
                    </View>

                    {/* DELIVERY */}

                    <View style={styles.section}>
                        <View style={styles.sectionHeading}>
                            <View
                                style={
                                    styles.headingIcon
                                }
                            >
                                <Ionicons
                                    name="location-outline"
                                    size={20}
                                    color={COLORS.black}
                                />
                            </View>

                            <View>
                                <Text
                                    style={
                                        styles.sectionTitle
                                    }
                                >
                                    Delivery Address
                                </Text>

                                <Text
                                    style={
                                        styles.sectionSubtitle
                                    }
                                >
                                    Where should we deliver
                                    your order?
                                </Text>
                            </View>
                        </View>

                        {savedAddresses.length > 0 && (
                            <View style={styles.savedAddressCard}>
                                <View style={styles.savedAddressHeader}>
                                    <View style={styles.savedAddressHeaderText}>
                                        <Text style={styles.savedAddressTitle}>Saved address</Text>
                                        <Text style={styles.savedAddressSubtitle}>
                                            {loadingSavedAddress ? "Loading..." : "Select an address from your account"}
                                        </Text>
                                    </View>
                                    <Pressable onPress={() => router.push("/addresses")} style={styles.manageAddressButton}>
                                        <Text style={styles.manageAddressText}>Manage</Text>
                                    </Pressable>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedAddressList}>
                                    {savedAddresses.map((item) => (
                                        <Pressable key={String(item._id)} onPress={() => applySavedAddress(item)} style={styles.savedAddressOption}>
                                            <Ionicons name={item.isDefault ? "checkmark-circle" : "location-outline"} size={18} color={COLORS.black} />
                                            <View style={styles.savedAddressOptionText}>
                                                <Text style={styles.savedAddressOptionTitle}>{item.type ?? "Address"}</Text>
                                                <Text numberOfLines={2} style={styles.savedAddressOptionBody}>
                                                    {item.street}, {item.city}, {item.state} - {item.zipCode}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.card}>
                            {/* FULL NAME */}

                            <Text style={styles.inputLabel}>
                                Full Name
                            </Text>

                            <TextInput
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Enter your full name"
                                placeholderTextColor="#A5A5A5"
                                style={styles.input}
                                autoCapitalize="words"
                            />

                            {/* PHONE */}

                            <Text
                                style={[
                                    styles.inputLabel,
                                    styles.inputSpacing,
                                ]}
                            >
                                Phone Number
                            </Text>

                            <TextInput
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="10-digit mobile number"
                                placeholderTextColor="#A5A5A5"
                                style={styles.input}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                            {/* ADDRESS */}

                            <Text
                                style={[
                                    styles.inputLabel,
                                    styles.inputSpacing,
                                ]}
                            >
                                Address
                            </Text>

                            <TextInput
                                value={address}
                                onChangeText={setAddress}
                                placeholder="House / Flat / Street / Area"
                                placeholderTextColor="#A5A5A5"
                                style={[
                                    styles.input,
                                    styles.multilineInput,
                                ]}
                                multiline
                                textAlignVertical="top"
                            />

                            {/* CITY + STATE */}

                            <View
                                style={
                                    styles.twoColumnRow
                                }
                            >
                                <View
                                    style={
                                        styles.columnInput
                                    }
                                >
                                    <Text
                                        style={
                                            styles.inputLabel
                                        }
                                    >
                                        City
                                    </Text>

                                    <TextInput
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder="City"
                                        placeholderTextColor="#A5A5A5"
                                        style={
                                            styles.input
                                        }
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View
                                    style={
                                        styles.columnInput
                                    }
                                >
                                    <Text
                                        style={
                                            styles.inputLabel
                                        }
                                    >
                                        State
                                    </Text>

                                    <TextInput
                                        value={state}
                                        onChangeText={setState}
                                        placeholder="State"
                                        placeholderTextColor="#A5A5A5"
                                        style={
                                            styles.input
                                        }
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            {/* PIN */}

                            <Text
                                style={[
                                    styles.inputLabel,
                                    styles.inputSpacing,
                                ]}
                            >
                                PIN Code
                            </Text>

                            <TextInput
                                value={pincode}
                                onChangeText={setPincode}
                                placeholder="6-digit PIN code"
                                placeholderTextColor="#A5A5A5"
                                style={styles.input}
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                        </View>
                    </View>

                    {/* PAYMENT */}

                    <View style={styles.section}>
                        <View style={styles.sectionHeading}>
                            <View
                                style={
                                    styles.headingIcon
                                }
                            >
                                <Ionicons
                                    name="card-outline"
                                    size={20}
                                    color={COLORS.black}
                                />
                            </View>

                            <View>
                                <Text
                                    style={
                                        styles.sectionTitle
                                    }
                                >
                                    Payment Method
                                </Text>

                                <Text
                                    style={
                                        styles.sectionSubtitle
                                    }
                                >
                                    Choose how you'd like to
                                    pay
                                </Text>
                            </View>
                        </View>

                        <View style={styles.paymentCard}>
                            {/* COD */}

                            <Pressable
                                onPress={() =>
                                    setPaymentMethod("cod")
                                }
                                style={[
                                    styles.paymentOption,
                                    paymentMethod === "cod" &&
                                        styles.paymentSelected,
                                ]}
                            >
                                <View
                                    style={
                                        styles.paymentIcon
                                    }
                                >
                                    <Ionicons
                                        name="cash-outline"
                                        size={23}
                                        color={
                                            COLORS.black
                                        }
                                    />
                                </View>

                                <View
                                    style={
                                        styles.paymentText
                                    }
                                >
                                    <Text
                                        style={
                                            styles.paymentTitle
                                        }
                                    >
                                        Cash on Delivery
                                    </Text>

                                    <Text
                                        style={
                                            styles.paymentSubtitle
                                        }
                                    >
                                        Pay when your order
                                        arrives
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.radio,
                                        paymentMethod ===
                                            "cod" &&
                                            styles.radioSelected,
                                    ]}
                                >
                                    {paymentMethod ===
                                    "cod" ? (
                                        <View
                                            style={
                                                styles.radioDot
                                            }
                                        />
                                    ) : null}
                                </View>
                            </Pressable>

                            {/* CARD */}

                            <Pressable
                                onPress={() =>
                                    setPaymentMethod("card")
                                }
                                style={[
                                    styles.paymentOption,
                                    paymentMethod === "card" &&
                                        styles.paymentSelected,
                                ]}
                            >
                                <View
                                    style={
                                        styles.paymentIcon
                                    }
                                >
                                    <Ionicons
                                        name="card-outline"
                                        size={23}
                                        color={
                                            COLORS.black
                                        }
                                    />
                                </View>

                                <View
                                    style={
                                        styles.paymentText
                                    }
                                >
                                    <Text
                                        style={
                                            styles.paymentTitle
                                        }
                                    >
                                        Credit / Debit Card
                                    </Text>

                                    <Text
                                        style={
                                            styles.paymentSubtitle
                                        }
                                    >
                                        Secure online payment
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.radio,
                                        paymentMethod ===
                                            "card" &&
                                            styles.radioSelected,
                                    ]}
                                >
                                    {paymentMethod ===
                                    "card" ? (
                                        <View
                                            style={
                                                styles.radioDot
                                            }
                                        />
                                    ) : null}
                                </View>
                            </Pressable>

                            {/* UPI */}

                            <Pressable
                                onPress={() =>
                                    setPaymentMethod("upi")
                                }
                                style={[
                                    styles.paymentOption,
                                    paymentMethod === "upi" &&
                                        styles.paymentSelected,
                                ]}
                            >
                                <View
                                    style={
                                        styles.paymentIcon
                                    }
                                >
                                    <Ionicons
                                        name="phone-portrait-outline"
                                        size={23}
                                        color={
                                            COLORS.black
                                        }
                                    />
                                </View>

                                <View
                                    style={
                                        styles.paymentText
                                    }
                                >
                                    <Text
                                        style={
                                            styles.paymentTitle
                                        }
                                    >
                                        UPI
                                    </Text>

                                    <Text
                                        style={
                                            styles.paymentSubtitle
                                        }
                                    >
                                        Pay using your UPI
                                        app
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.radio,
                                        paymentMethod ===
                                            "upi" &&
                                            styles.radioSelected,
                                    ]}
                                >
                                    {paymentMethod ===
                                    "upi" ? (
                                        <View
                                            style={
                                                styles.radioDot
                                            }
                                        />
                                    ) : null}
                                </View>
                            </Pressable>
                        </View>
                    </View>

                    {/* ORDER ITEMS */}

                    <View style={styles.section}>
                        <View style={styles.sectionHeading}>
                            <View
                                style={
                                    styles.headingIcon
                                }
                            >
                                <Ionicons
                                    name="bag-outline"
                                    size={20}
                                    color={COLORS.black}
                                />
                            </View>

                            <View>
                                <Text
                                    style={
                                        styles.sectionTitle
                                    }
                                >
                                    Your Order
                                </Text>

                                <Text
                                    style={
                                        styles.sectionSubtitle
                                    }
                                >
                                    {totalItems}{" "}
                                    {totalItems === 1
                                        ? "item"
                                        : "items"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.orderCard}>
                            {cartItems.map(
                                (item, index) => (
                                    <View
                                        key={`₹{item.productId}-₹{item.size}`}
                                        style={[
                                            styles.orderItem,
                                            index <
                                                cartItems.length -
                                                    1 &&
                                                styles.orderDivider,
                                        ]}
                                    >
                                        <View
                                            style={
                                                styles.orderImage
                                            }
                                        >
                                            {item.product
                                                .images?.[0] ? (
                                                <Image
                                                    source={{
                                                        uri: item
                                                            .product
                                                            .images[0],
                                                    }}
                                                    style={
                                                        styles.productImage
                                                    }
                                                />
                                            ) : (
                                                <Ionicons
                                                    name="image-outline"
                                                    size={25}
                                                    color="#AAAAAA"
                                                />
                                            )}
                                        </View>

                                        <View
                                            style={
                                                styles.orderInfo
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.productName
                                                }
                                                numberOfLines={
                                                    2
                                                }
                                            >
                                                {
                                                    item
                                                        .product
                                                        .name
                                                }
                                            </Text>

                                            <Text
                                                style={
                                                    styles.productMeta
                                                }
                                            >
                                                Size:{" "}
                                                {item.size}
                                                {"  "}×{" "}
                                                {item.quantity}
                                            </Text>

                                            <Text
                                                style={
                                                    styles.productPrice
                                                }
                                            >
                                                ₹
                                                {(
                                                    item.product
                                                        .price *
                                                    item.quantity
                                                ).toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                ),
                            )}
                        </View>
                    </View>

                    {/* SUMMARY */}

                    <View style={styles.section}>
                        <Text style={styles.summaryTitle}>
                            Order Summary
                        </Text>

                        <View style={styles.summaryCard}>
                            <View
                                style={
                                    styles.summaryRow
                                }
                            >
                                <Text
                                    style={
                                        styles.summaryLabel
                                    }
                                >
                                    Subtotal
                                </Text>

                                <Text
                                    style={
                                        styles.summaryValue
                                    }
                                >
                                    ₹{subtotal.toFixed(2)}
                                </Text>
                            </View>

                            <View
                                style={
                                    styles.summaryRow
                                }
                            >
                                <Text
                                    style={
                                        styles.summaryLabel
                                    }
                                >
                                    Shipping
                                </Text>

                                <Text
                                    style={[
                                        styles.summaryValue,
                                        shipping === 0 &&
                                            styles.freeText,
                                    ]}
                                >
                                    {shipping === 0
                                        ? "FREE"
                                        : `₹₹{shipping.toFixed(
                                              2,
                                          )}`}
                                </Text>
                            </View>

                            {shipping > 0 ? (
                                <Text
                                    style={
                                        styles.shippingHint
                                    }
                                >
                                    Free shipping on orders
                                    over ₹1,000
                                </Text>
                            ) : null}

                            <View
                                style={
                                    styles.summaryDivider
                                }
                            />

                            <View
                                style={
                                    styles.totalRow
                                }
                            >
                                <Text
                                    style={
                                        styles.totalLabel
                                    }
                                >
                                    Total
                                </Text>

                                <Text
                                    style={
                                        styles.totalValue
                                    }
                                >
                                    ₹{total.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* TRUST */}

                    <View style={styles.trustCard}>
                        <View style={styles.trustItem}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={21}
                                color={
                                    COLORS.success
                                }
                            />

                            <Text
                                style={
                                    styles.trustText
                                }
                            >
                                Secure Checkout
                            </Text>
                        </View>

                        <View style={styles.trustItem}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={19}
                                color={
                                    COLORS.success
                                }
                            />

                            <Text
                                style={
                                    styles.trustText
                                }
                            >
                                Safe & Protected
                            </Text>
                        </View>
                    </View>

                    <View style={styles.bottomSpace} />
                </ScrollView>

                {/* BOTTOM CHECKOUT BAR */}

                <View style={styles.bottomBar}>
                    <View>
                        <Text style={styles.bottomLabel}>
                            Total
                        </Text>

                        <Text style={styles.bottomTotal}>
                            ₹{total.toFixed(2)}
                        </Text>
                    </View>

                    <Pressable
                        onPress={handleContinueToReview}
                        disabled={placingOrder}
                        style={({ pressed }) => [
                            styles.placeOrderButton,
                            pressed &&
                                !placingOrder &&
                                styles.placeOrderPressed,
                            placingOrder &&
                                styles.placeOrderDisabled,
                        ]}
                    >
                        {placingOrder ? (
                            <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                            />
                        ) : (
                            <>
                                <Text
                                    style={
                                        styles.placeOrderText
                                    }
                                >
                                    Review Order
                                </Text>

                                <Ionicons
                                    name="arrow-forward"
                                    size={20}
                                    color="#FFFFFF"
                                />
                            </>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    /* HEADER */

    header: {
        height: 58,
        backgroundColor: COLORS.white,
        borderBottomWidth:
            StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        paddingHorizontal: 16,
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,

        alignItems: "center",
        justifyContent: "center",
    },

    headerSpacer: {
        width: 40,
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },

    scroll: {
        flex: 1,
    },

    scrollContent: {
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",

        paddingHorizontal: 16,
        paddingTop: 18,
    },

    /* STEPS */

    stepBar: {
        width: "100%",
        height: 58,

        backgroundColor: COLORS.white,

        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,

        paddingHorizontal: 20,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        marginBottom: 22,
    },

    step: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    stepActive: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,

        backgroundColor: "#EEEEEE",

        alignItems: "center",
        justifyContent: "center",
    },

    stepCircleActive: {
        width: 28,
        height: 28,
        borderRadius: 14,

        backgroundColor: COLORS.black,

        alignItems: "center",
        justifyContent: "center",
    },

    stepNumber: {
        fontSize: 12,
        fontWeight: "700",
        color: "#777777",
    },

    stepNumberActive: {
        fontSize: 12,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    stepText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#999999",
    },

    stepTextActive: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.black,
    },

    stepLine: {
        width: 45,
        height: 1,
        backgroundColor: "#DDDDDD",
        marginHorizontal: 15,
    },

    /* SECTIONS */

    section: {
        marginBottom: 24,
    },

    sectionHeading: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 11,
    },

    headingIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,

        backgroundColor: COLORS.white,

        borderWidth: 1,
        borderColor: COLORS.border,

        alignItems: "center",
        justifyContent: "center",

        marginRight: 12,
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.text,
    },

    sectionSubtitle: {
        marginTop: 2,
        fontSize: 12,
        color: COLORS.secondary,
    },

    savedAddressCard: {
        backgroundColor: COLORS.white,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 12,
    },
    savedAddressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    savedAddressHeaderText: { flex: 1 },
    savedAddressTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text },
    savedAddressSubtitle: { marginTop: 3, fontSize: 10, color: COLORS.secondary },
    manageAddressButton: { paddingHorizontal: 10, paddingVertical: 7 },
    manageAddressText: { fontSize: 11, fontWeight: "700", color: COLORS.text },
    savedAddressList: { gap: 9, paddingTop: 11 },
    savedAddressOption: { width: 190, minHeight: 72, padding: 11, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "flex-start" },
    savedAddressOptionText: { flex: 1, marginLeft: 8 },
    savedAddressOptionTitle: { fontSize: 11, fontWeight: "800", color: COLORS.text },
    savedAddressOptionBody: { marginTop: 4, fontSize: 10, lineHeight: 14, color: COLORS.secondary },

    /* FORM */

    card: {
        backgroundColor: COLORS.white,

        borderRadius: 17,
        borderWidth: 1,
        borderColor: COLORS.border,

        padding: 17,
    },

    inputLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 7,
    },

    inputSpacing: {
        marginTop: 16,
    },

    input: {
        width: "100%",
        height: 48,

        borderWidth: 1,
        borderColor: "#DEDEDE",
        borderRadius: 11,

        backgroundColor: "#FCFCFC",

        paddingHorizontal: 13,

        fontSize: 14,
        color: COLORS.text,
    },

    multilineInput: {
        height: 82,
        paddingTop: 13,
        paddingBottom: 13,
    },

    twoColumnRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 16,
    },

    columnInput: {
        flex: 1,
    },

    /* PAYMENT */

    paymentCard: {
        backgroundColor: COLORS.white,

        borderRadius: 17,
        borderWidth: 1,
        borderColor: COLORS.border,

        overflow: "hidden",
    },

    paymentOption: {
        minHeight: 76,

        paddingHorizontal: 14,

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: COLORS.white,
    },

    paymentSelected: {
        backgroundColor: "#FAFAFA",
    },

    paymentIcon: {
        width: 44,
        height: 44,
        borderRadius: 13,

        backgroundColor: COLORS.soft,

        alignItems: "center",
        justifyContent: "center",

        marginRight: 13,
    },

    paymentText: {
        flex: 1,
    },

    paymentTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.text,
    },

    paymentSubtitle: {
        marginTop: 3,
        fontSize: 12,
        color: COLORS.secondary,
    },

    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,

        borderWidth: 1.5,
        borderColor: "#BBBBBB",

        alignItems: "center",
        justifyContent: "center",
    },

    radioSelected: {
        borderColor: COLORS.black,
    },

    radioDot: {
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: COLORS.black,
    },

    /* ORDER */

    orderCard: {
        backgroundColor: COLORS.white,

        borderRadius: 17,
        borderWidth: 1,
        borderColor: COLORS.border,

        overflow: "hidden",
    },

    orderItem: {
        minHeight: 105,

        padding: 13,

        flexDirection: "row",
        alignItems: "center",
    },

    orderDivider: {
        borderBottomWidth:
            StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border,
    },

    orderImage: {
        width: 78,
        height: 78,

        borderRadius: 13,

        backgroundColor: "#F1F1F1",

        alignItems: "center",
        justifyContent: "center",

        overflow: "hidden",

        marginRight: 13,
    },

    productImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },

    orderInfo: {
        flex: 1,
        minWidth: 0,
    },

    productName: {
        fontSize: 14,
        lineHeight: 19,
        fontWeight: "700",
        color: COLORS.text,
    },

    productMeta: {
        marginTop: 5,
        fontSize: 12,
        color: COLORS.secondary,
    },

    productPrice: {
        marginTop: 7,
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.black,
    },

    /* SUMMARY */

    summaryTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 11,
    },

    summaryCard: {
        backgroundColor: COLORS.white,

        borderRadius: 17,
        borderWidth: 1,
        borderColor: COLORS.border,

        padding: 17,
    },

    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        marginBottom: 11,
    },

    summaryLabel: {
        fontSize: 14,
        color: COLORS.secondary,
    },

    summaryValue: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
    },

    freeText: {
        color: COLORS.success,
    },

    shippingHint: {
        fontSize: 11,
        color: COLORS.muted,
        marginTop: -4,
        marginBottom: 5,
    },

    summaryDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 6,
    },

    totalRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        marginTop: 5,
    },

    totalLabel: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
    },

    totalValue: {
        fontSize: 21,
        fontWeight: "800",
        color: COLORS.black,
    },

    /* TRUST */

    trustCard: {
        backgroundColor: "#F1FAF5",

        borderRadius: 15,

        paddingHorizontal: 15,
        paddingVertical: 13,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },

    trustItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
    },

    trustText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#397A57",
    },

    bottomSpace: {
        height: 25,
    },

    /* BOTTOM BAR */

    bottomBar: {
        minHeight: 78,

        backgroundColor: COLORS.white,

        borderTopWidth: 1,
        borderTopColor: COLORS.border,

        paddingHorizontal: 17,
        paddingTop: 11,
        paddingBottom: Platform.OS === "ios" ? 12 : 10,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    bottomLabel: {
        fontSize: 11,
        color: COLORS.secondary,
        marginBottom: 2,
    },

    bottomTotal: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.black,
    },

    placeOrderButton: {
        minWidth: 175,
        height: 52,

        paddingHorizontal: 20,

        borderRadius: 14,

        backgroundColor: COLORS.black,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        gap: 9,
    },

    placeOrderText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    placeOrderPressed: {
        backgroundColor: "#333333",
    },

    placeOrderDisabled: {
        opacity: 0.65,
    },

    /* EMPTY */

    emptyContainer: {
        flex: 1,

        alignItems: "center",
        justifyContent: "center",

        paddingHorizontal: 30,
    },

    emptyIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,

        backgroundColor: COLORS.soft,

        alignItems: "center",
        justifyContent: "center",

        marginBottom: 20,
    },

    emptyTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: COLORS.text,
        textAlign: "center",
    },

    emptySubtitle: {
        maxWidth: 320,

        marginTop: 9,

        fontSize: 14,
        lineHeight: 21,

        color: COLORS.secondary,

        textAlign: "center",
    },

    shopButton: {
        minHeight: 52,

        marginTop: 24,

        paddingHorizontal: 23,

        borderRadius: 14,

        backgroundColor: COLORS.black,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        gap: 9,
    },

    shopButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },
});