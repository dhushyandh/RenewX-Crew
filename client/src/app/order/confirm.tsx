import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";

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

type CheckoutItem = {
    productId: string;
    product: {
        _id: string;
        name: string;
        price: number;
        images?: string[];
    };
    size: string;
    quantity: number;
    price: number;
};

type CheckoutData = {
    customer: {
        fullName: string;
        phone: string;
    };

    shippingAddress: {
        address: string;
        city: string;
        state: string;
        pincode: string;
    };

    paymentMethod: PaymentMethod;

    items: CheckoutItem[];

    pricing: {
        subtotal: number;
        shipping: number;
        total: number;
        totalItems: number;
    };

    createdAt: string;
};

export default function OrderConfirmScreen() {
    const router = useRouter();

    const params =
        useLocalSearchParams<{
            checkoutData?: string;
        }>();

    const [placingOrder, setPlacingOrder] =
        useState(false);

    const checkoutData = useMemo<CheckoutData | null>(
        () => {
            if (!params.checkoutData) {
                return null;
            }

            try {
                return JSON.parse(
                    params.checkoutData
                ) as CheckoutData;
            } catch (error) {
                console.error(
                    "Invalid checkout data:",
                    error
                );

                return null;
            }
        },
        [params.checkoutData]
    );

    const paymentLabel = useMemo(() => {
        if (!checkoutData) {
            return "";
        }

        switch (
            checkoutData.paymentMethod
        ) {
            case "cod":
                return "Cash on Delivery";

            case "card":
                return "Credit / Debit Card";

            case "upi":
                return "UPI";

            default:
                return "Payment";
        }
    }, [checkoutData]);

    const paymentIcon =
        checkoutData?.paymentMethod === "cod"
            ? "cash-outline"
            : checkoutData?.paymentMethod === "upi"
                ? "phone-portrait-outline"
                : "card-outline";

    const handlePlaceOrder = async () => {
        if (!checkoutData) {
            Alert.alert(
                "Checkout Error",
                "Your checkout information is missing. Please return to checkout."
            );

            router.replace("/checkout");
            return;
        }

        setPlacingOrder(true);

        try {
            /*
             * =========================================================
             * ORDER API GOES HERE
             * =========================================================
             *
             * At the moment your checkout flow does not expose
             * an order-creation API in the uploaded code.
             *
             * We therefore do NOT pretend that an order was created.
             *
             * Once your order API is connected, this is where:
             *
             * await api.createOrder(...)
             *
             * should happen.
             */

            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 700)
            );

            /*
             * Temporary confirmation.
             *
             * This gives us the correct UI/navigation flow first.
             */
            Alert.alert(
                "Order Ready",
                "Your order details have been confirmed. The order API can now be connected.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            router.replace(
                                "/orders" as any
                            );
                        },
                    },
                ]
            );
        } catch (error) {
            console.error(
                "Place order error:",
                error
            );

            Alert.alert(
                "Order Failed",
                "We couldn't place your order. Please try again."
            );
        } finally {
            setPlacingOrder(false);
        }
    };

    if (!checkoutData) {
        return (
            <SafeAreaView
                style={styles.safeArea}
                edges={["top"]}
            >
                <View style={styles.header}>
                    <Pressable
                        onPress={() =>
                            router.back()
                        }
                        style={
                            styles.headerButton
                        }
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={
                                COLORS.black
                            }
                        />
                    </Pressable>

                    <Text
                        style={
                            styles.headerTitle
                        }
                    >
                        Confirm Order
                    </Text>

                    <View
                        style={
                            styles.headerSpacer
                        }
                    />
                </View>

                <View
                    style={
                        styles.errorContainer
                    }
                >
                    <View
                        style={
                            styles.errorIcon
                        }
                    >
                        <Ionicons
                            name="alert-circle-outline"
                            size={42}
                            color={
                                COLORS.accent
                            }
                        />
                    </View>

                    <Text
                        style={
                            styles.errorTitle
                        }
                    >
                        Checkout information missing
                    </Text>

                    <Text
                        style={
                            styles.errorText
                        }
                    >
                        We couldn't load your order
                        details. Please return to
                        checkout and try again.
                    </Text>

                    <Pressable
                        onPress={() =>
                            router.replace(
                                "/checkout"
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
                            Back to Checkout
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
            <View style={styles.screen}>
                {/* =====================================================
                    HEADER
                ====================================================== */}

                <View style={styles.header}>
                    <Pressable
                        onPress={() =>
                            router.back()
                        }
                        style={
                            styles.headerButton
                        }
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={
                                COLORS.black
                            }
                        />
                    </Pressable>

                    <Text
                        style={
                            styles.headerTitle
                        }
                    >
                        Confirm Order
                    </Text>

                    <View
                        style={
                            styles.headerSpacer
                        }
                    />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    showsVerticalScrollIndicator={
                        false
                    }
                >
                    {/* =================================================
                        CONFIRMATION HEADER
                    ================================================== */}

                    <View
                        style={
                            styles.confirmHero
                        }
                    >
                        <View
                            style={
                                styles.confirmIcon
                            }
                        >
                            <Ionicons
                                name="checkmark"
                                size={31}
                                color={
                                    COLORS.success
                                }
                            />
                        </View>

                        <Text
                            style={
                                styles.confirmTitle
                            }
                        >
                            Review Your Order
                        </Text>

                        <Text
                            style={
                                styles.confirmSubtitle
                            }
                        >
                            Please check your details
                            carefully before placing
                            your order.
                        </Text>
                    </View>

                    {/* =================================================
                        DELIVERY ADDRESS
                    ================================================== */}

                    <SectionTitle
                        icon="location-outline"
                        title="Delivery Address"
                        subtitle="Your order will be delivered here"
                    />

                    <View
                        style={
                            styles.card
                        }
                    >
                        <View
                            style={
                                styles.addressHeader
                            }
                        >
                            <View
                                style={
                                    styles.addressIcon
                                }
                            >
                                <Ionicons
                                    name="home-outline"
                                    size={20}
                                    color={
                                        COLORS.black
                                    }
                                />
                            </View>

                            <View
                                style={
                                    styles.addressNameContainer
                                }
                            >
                                <Text
                                    style={
                                        styles.customerName
                                    }
                                >
                                    {
                                        checkoutData
                                            .customer
                                            .fullName
                                    }
                                </Text>

                                <Text
                                    style={
                                        styles.phone
                                    }
                                >
                                    {
                                        checkoutData
                                            .customer
                                            .phone
                                    }
                                </Text>
                            </View>
                        </View>

                        <View
                            style={
                                styles.addressDivider
                            }
                        />

                        <Text
                            style={
                                styles.addressText
                            }
                        >
                            {
                                checkoutData
                                    .shippingAddress
                                    .address
                            }
                        </Text>

                        <Text
                            style={
                                styles.addressText
                            }
                        >
                            {
                                checkoutData
                                    .shippingAddress
                                    .city
                            }
                            ,{" "}
                            {
                                checkoutData
                                    .shippingAddress
                                    .state
                            }
                        </Text>

                        <Text
                            style={
                                styles.addressPin
                            }
                        >
                            {
                                checkoutData
                                    .shippingAddress
                                    .pincode
                            }
                        </Text>
                    </View>

                    {/* =================================================
                        PAYMENT
                    ================================================== */}

                    <SectionTitle
                        icon="card-outline"
                        title="Payment Method"
                        subtitle="Selected payment option"
                    />

                    <View
                        style={
                            styles.card
                        }
                    >
                        <View
                            style={
                                styles.paymentRow
                            }
                        >
                            <View
                                style={
                                    styles.paymentIcon
                                }
                            >
                                <Ionicons
                                    name={
                                        paymentIcon
                                    }
                                    size={22}
                                    color={
                                        COLORS.black
                                    }
                                />
                            </View>

                            <View
                                style={
                                    styles.paymentInfo
                                }
                            >
                                <Text
                                    style={
                                        styles.paymentTitle
                                    }
                                >
                                    {paymentLabel}
                                </Text>

                                <Text
                                    style={
                                        styles.paymentSubtitle
                                    }
                                >
                                    {checkoutData
                                        .paymentMethod ===
                                    "cod"
                                        ? "Pay when your order arrives"
                                        : checkoutData
                                            .paymentMethod ===
                                            "upi"
                                            ? "Pay securely using your UPI app"
                                            : "Secure online card payment"}
                                </Text>
                            </View>

                            <View
                                style={
                                    styles.selectedBadge
                                }
                            >
                                <Ionicons
                                    name="checkmark-circle"
                                    size={20}
                                    color={
                                        COLORS.success
                                    }
                                />
                            </View>
                        </View>
                    </View>

                    {/* =================================================
                        YOUR ITEMS
                    ================================================== */}

                    <SectionTitle
                        icon="bag-outline"
                        title="Your Items"
                        subtitle={`${checkoutData.pricing.totalItems} ${
                            checkoutData.pricing
                                .totalItems ===
                            1
                                ? "item"
                                : "items"
                        }`}
                    />

                    <View
                        style={
                            styles.itemsCard
                        }
                    >
                        {checkoutData.items.map(
                            (item, index) => {
                                const image =
                                    item.product
                                        .images?.[0];

                                return (
                                    <View
                                        key={`${item.productId}-${item.size}-${index}`}
                                        style={[
                                            styles.itemRow,
                                            index <
                                                checkoutData
                                                    .items
                                                    .length -
                                                    1 &&
                                                styles.itemDivider,
                                        ]}
                                    >
                                        <View
                                            style={
                                                styles.itemImageContainer
                                            }
                                        >
                                            {image ? (
                                                <Image
                                                    source={{
                                                        uri: image,
                                                    }}
                                                    style={
                                                        styles.itemImage
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
                                                styles.itemInfo
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.itemName
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
                                                    styles.itemMeta
                                                }
                                            >
                                                Size:{" "}
                                                {
                                                    item.size
                                                }
                                                {"  "}×{" "}
                                                {
                                                    item.quantity
                                                }
                                            </Text>

                                            <Text
                                                style={
                                                    styles.itemPrice
                                                }
                                            >
                                                $
                                                {(
                                                    item.price *
                                                    item.quantity
                                                ).toFixed(
                                                    2
                                                )}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            }
                        )}
                    </View>

                    {/* =================================================
                        ORDER SUMMARY
                    ================================================== */}

                    <Text
                        style={
                            styles.summaryTitle
                        }
                    >
                        Order Summary
                    </Text>

                    <View
                        style={
                            styles.summaryCard
                        }
                    >
                        <SummaryRow
                            label="Subtotal"
                            value={`$${checkoutData.pricing.subtotal.toFixed(
                                2
                            )}`}
                        />

                        <SummaryRow
                            label="Shipping"
                            value={
                                checkoutData
                                    .pricing
                                    .shipping ===
                                0
                                    ? "FREE"
                                    : `$${checkoutData.pricing.shipping.toFixed(
                                        2
                                    )}`
                            }
                            valueStyle={
                                checkoutData
                                    .pricing
                                    .shipping ===
                                0
                                    ? styles.freeText
                                    : undefined
                            }
                        />

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
                                $
                                {checkoutData.pricing.total.toFixed(
                                    2
                                )}
                            </Text>
                        </View>
                    </View>

                    {/* =================================================
                        SECURITY
                    ================================================== */}

                    <View
                        style={
                            styles.secureCard
                        }
                    >
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={22}
                            color={
                                COLORS.success
                            }
                        />

                        <View
                            style={
                                styles.secureTextContainer
                            }
                        >
                            <Text
                                style={
                                    styles.secureTitle
                                }
                            >
                                Secure Checkout
                            </Text>

                            <Text
                                style={
                                    styles.secureSubtitle
                                }
                            >
                                Your order information is
                                protected.
                            </Text>
                        </View>
                    </View>

                    <View
                        style={
                            styles.bottomSpace
                        }
                    />
                </ScrollView>

                {/* =====================================================
                    BOTTOM BAR
                ====================================================== */}

                <View
                    style={
                        styles.bottomBar
                    }
                >
                    <View>
                        <Text
                            style={
                                styles.bottomLabel
                            }
                        >
                            Total
                        </Text>

                        <Text
                            style={
                                styles.bottomTotal
                            }
                        >
                            $
                            {checkoutData.pricing.total.toFixed(
                                2
                            )}
                        </Text>
                    </View>

                    <Pressable
                        onPress={
                            handlePlaceOrder
                        }
                        disabled={
                            placingOrder
                        }
                        style={({ pressed }) => [
                            styles.placeButton,
                            pressed &&
                                !placingOrder &&
                                styles.placeButtonPressed,
                            placingOrder &&
                                styles.placeButtonDisabled,
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
                                        styles.placeButtonText
                                    }
                                >
                                    Place Order
                                </Text>

                                <Ionicons
                                    name="checkmark"
                                    size={20}
                                    color="#FFFFFF"
                                />
                            </>
                        )}
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}


/* ================================================================
   SECTION TITLE
================================================================ */

function SectionTitle({
    icon,
    title,
    subtitle,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
}) {
    return (
        <View
            style={
                styles.sectionHeading
            }
        >
            <View
                style={
                    styles.sectionIcon
                }
            >
                <Ionicons
                    name={icon}
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
                    {title}
                </Text>

                <Text
                    style={
                        styles.sectionSubtitle
                    }
                >
                    {subtitle}
                </Text>
            </View>
        </View>
    );
}


/* ================================================================
   SUMMARY ROW
================================================================ */

function SummaryRow({
    label,
    value,
    valueStyle,
}: {
    label: string;
    value: string;
    valueStyle?: object;
}) {
    return (
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
                {label}
            </Text>

            <Text
                style={[
                    styles.summaryValue,
                    valueStyle,
                ]}
            >
                {value}
            </Text>
        </View>
    );
}


/* ================================================================
   STYLES
================================================================ */

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor:
            COLORS.background,
    },

    screen: {
        flex: 1,
        backgroundColor:
            COLORS.background,
    },

    /* HEADER */

    header: {
        height: 58,
        backgroundColor:
            COLORS.white,
        borderBottomWidth:
            StyleSheet.hairlineWidth,
        borderBottomColor:
            COLORS.border,

        flexDirection: "row",
        alignItems: "center",
        justifyContent:
            "space-between",

        paddingHorizontal: 16,
    },

    headerButton: {
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

    /* SCROLL */

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

    /* HERO */

    confirmHero: {
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 24,
    },

    confirmIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,

        backgroundColor:
            "#EAF7F0",

        alignItems: "center",
        justifyContent: "center",

        marginBottom: 13,
    },

    confirmTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.text,
        textAlign: "center",
    },

    confirmSubtitle: {
        maxWidth: 350,

        marginTop: 7,

        fontSize: 12,
        lineHeight: 18,

        color: COLORS.secondary,

        textAlign: "center",
    },

    /* SECTION */

    sectionHeading: {
        flexDirection: "row",
        alignItems: "center",

        marginBottom: 10,
    },

    sectionIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,

        backgroundColor:
            COLORS.white,

        borderWidth: 1,
        borderColor:
            COLORS.border,

        alignItems: "center",
        justifyContent: "center",

        marginRight: 12,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
    },

    sectionSubtitle: {
        marginTop: 2,

        fontSize: 11,

        color: COLORS.secondary,
    },

    /* CARD */

    card: {
        backgroundColor:
            COLORS.white,

        borderRadius: 17,

        borderWidth: 1,
        borderColor:
            COLORS.border,

        padding: 16,

        marginBottom: 23,
    },

    /* ADDRESS */

    addressHeader: {
        flexDirection: "row",
        alignItems: "center",
    },

    addressIcon: {
        width: 43,
        height: 43,
        borderRadius: 13,

        backgroundColor:
            COLORS.soft,

        alignItems: "center",
        justifyContent: "center",
    },

    addressNameContainer: {
        flex: 1,
        marginLeft: 11,
    },

    customerName: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.text,
    },

    phone: {
        marginTop: 3,
        fontSize: 11,
        color: COLORS.secondary,
    },

    addressDivider: {
        height: 1,
        backgroundColor:
            COLORS.border,

        marginVertical: 13,
    },

    addressText: {
        fontSize: 13,
        lineHeight: 19,
        color: "#333333",
    },

    addressPin: {
        marginTop: 3,
        fontSize: 12,
        color: COLORS.secondary,
    },

    /* PAYMENT */

    paymentRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    paymentIcon: {
        width: 45,
        height: 45,
        borderRadius: 13,

        backgroundColor:
            COLORS.soft,

        alignItems: "center",
        justifyContent: "center",
    },

    paymentInfo: {
        flex: 1,
        marginLeft: 12,
    },

    paymentTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.text,
    },

    paymentSubtitle: {
        marginTop: 4,
        fontSize: 11,
        color: COLORS.secondary,
    },

    selectedBadge: {
        marginLeft: 8,
    },

    /* ITEMS */

    itemsCard: {
        backgroundColor:
            COLORS.white,

        borderRadius: 17,

        borderWidth: 1,
        borderColor:
            COLORS.border,

        overflow: "hidden",

        marginBottom: 23,
    },

    itemRow: {
        minHeight: 104,

        padding: 13,

        flexDirection: "row",
        alignItems: "center",
    },

    itemDivider: {
        borderBottomWidth:
            StyleSheet.hairlineWidth,
        borderBottomColor:
            COLORS.border,
    },

    itemImageContainer: {
        width: 76,
        height: 76,

        borderRadius: 13,

        backgroundColor:
            "#F1F1F1",

        alignItems: "center",
        justifyContent: "center",

        overflow: "hidden",

        marginRight: 13,
    },

    itemImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },

    itemInfo: {
        flex: 1,
        minWidth: 0,
    },

    itemName: {
        fontSize: 14,
        lineHeight: 19,
        fontWeight: "700",
        color: COLORS.text,
    },

    itemMeta: {
        marginTop: 5,
        fontSize: 11,
        color: COLORS.secondary,
    },

    itemPrice: {
        marginTop: 7,
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.black,
    },

    /* SUMMARY */

    summaryTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,

        marginBottom: 10,
    },

    summaryCard: {
        backgroundColor:
            COLORS.white,

        borderRadius: 17,

        borderWidth: 1,
        borderColor:
            COLORS.border,

        padding: 17,

        marginBottom: 16,
    },

    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent:
            "space-between",

        marginBottom: 11,
    },

    summaryLabel: {
        fontSize: 13,
        color: COLORS.secondary,
    },

    summaryValue: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.text,
    },

    freeText: {
        color: COLORS.success,
    },

    summaryDivider: {
        height: 1,
        backgroundColor:
            COLORS.border,

        marginVertical: 5,
    },

    totalRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent:
            "space-between",

        marginTop: 7,
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

    /* SECURITY */

    secureCard: {
        minHeight: 62,

        paddingHorizontal: 15,

        borderRadius: 15,

        backgroundColor:
            "#F1FAF5",

        flexDirection: "row",
        alignItems: "center",
    },

    secureTextContainer: {
        flex: 1,
        marginLeft: 10,
    },

    secureTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: "#397A57",
    },

    secureSubtitle: {
        marginTop: 3,
        fontSize: 10,
        color: "#5E9274",
    },

    bottomSpace: {
        height: 25,
    },

    /* BOTTOM BAR */

    bottomBar: {
        minHeight: 78,

        backgroundColor:
            COLORS.white,

        borderTopWidth: 1,
        borderTopColor:
            COLORS.border,

        paddingHorizontal: 17,
        paddingTop: 10,
        paddingBottom:
            Platform.OS === "ios"
                ? 12
                : 10,

        flexDirection: "row",
        alignItems: "center",
        justifyContent:
            "space-between",
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

    placeButton: {
        minWidth: 170,
        height: 52,

        paddingHorizontal: 20,

        borderRadius: 14,

        backgroundColor:
            COLORS.black,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        gap: 9,
    },

    placeButtonText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    placeButtonPressed: {
        backgroundColor: "#333333",
    },

    placeButtonDisabled: {
        opacity: 0.65,
    },

    /* ERROR */

    errorContainer: {
        flex: 1,

        alignItems: "center",
        justifyContent: "center",

        paddingHorizontal: 30,
    },

    errorIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,

        backgroundColor:
            "#FFF0EE",

        alignItems: "center",
        justifyContent: "center",

        marginBottom: 18,
    },

    errorTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.text,

        textAlign: "center",
    },

    errorText: {
        maxWidth: 340,

        marginTop: 8,

        fontSize: 13,
        lineHeight: 20,

        color: COLORS.secondary,

        textAlign: "center",
    },

    primaryButton: {
        minHeight: 50,

        marginTop: 22,

        paddingHorizontal: 22,

        borderRadius: 14,

        backgroundColor:
            COLORS.black,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        gap: 8,
    },

    primaryButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});