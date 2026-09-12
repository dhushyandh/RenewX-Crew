import React from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { COLORS } from "@/constants";

export default function Reviews() {
    const router = useRouter();

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top"]}
        >
            <View style={styles.screen}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                        hitSlop={10}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color="#171717"
                        />
                    </Pressable>

                    <Text style={styles.headerTitle}>
                        My Reviews
                    </Text>

                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        <View style={styles.emptyIcon}>
                            <Ionicons
                                name="star-outline"
                                size={38}
                                color="#55555D"
                            />
                        </View>

                        <Text style={styles.title}>
                            No Reviews Yet
                        </Text>

                        <Text style={styles.description}>
                            Your product reviews will appear
                            here after you've purchased and
                            reviewed an item.
                        </Text>

                        <Pressable
                            onPress={() =>
                                router.push("/shop")
                            }
                            style={({ pressed }) => [
                                styles.button,
                                pressed &&
                                    styles.buttonPressed,
                            ]}
                        >
                            <Text style={styles.buttonText}>
                                Explore Products
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={17}
                                color="#FFFFFF"
                            />
                        </Pressable>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F8F8F8",
    },

    screen: {
        flex: 1,
        backgroundColor: "#F8F8F8",
    },

    header: {
        height: 58,
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth:
            StyleSheet.hairlineWidth,
        borderBottomColor: "#EAEAEA",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#F5F5F6",
        alignItems: "center",
        justifyContent: "center",
    },

    headerTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#151515",
    },

    headerSpacer: {
        width: 38,
    },

    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
    },

    content: {
        width: "100%",
        maxWidth: 460,
        alignSelf: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#EEEEEE",
        paddingHorizontal: 28,
        paddingVertical: 42,
    },

    emptyIcon: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: "#F3F3F4",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },

    title: {
        fontSize: 21,
        fontWeight: "700",
        color: "#171717",
        textAlign: "center",
        marginBottom: 8,
    },

    description: {
        maxWidth: 340,
        fontSize: 13,
        lineHeight: 20,
        color: "#85858B",
        textAlign: "center",
        marginBottom: 26,
    },

    button: {
        minWidth: 190,
        height: 48,
        paddingHorizontal: 20,
        borderRadius: 25,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
    },

    buttonText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "700",
    },

    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
});