import { COLORS } from "@/constants";
import { useSSO } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import type { EmailCodeFactor } from "@clerk/shared/types";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Link, useRouter } from "expo-router";
import * as React from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/*
 * Required for completing OAuth popup sessions on web.
 *
 * Without this, Google authentication can finish in the popup,
 * but the callback may not be handed back to the main window
 * correctly.
 */
WebBrowser.maybeCompleteAuthSession();

export default function Page() {
    const { signIn, setActive, isLoaded } = useSignIn();
    const { startSSOFlow } = useSSO();
    const router = useRouter();

    const [emailAddress, setEmailAddress] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [code, setCode] = React.useState("");

    const [showPassword, setShowPassword] = React.useState(false);
    const [showEmailCode, setShowEmailCode] = React.useState(false);

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const getClerkError = React.useCallback((err: any) => {
        return (
            err?.errors?.[0]?.longMessage ||
            err?.errors?.[0]?.message ||
            "Something went wrong. Please try again."
        );
    }, []);

    const validateEmail = React.useCallback((email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }, []);

    /*
     * -----------------------------------------
     * EMAIL / PASSWORD SIGN IN
     * -----------------------------------------
     */
    const onSignInPress = async () => {
        if (!isLoaded || loading) return;

        setError("");

        const email = emailAddress.trim();

        if (!email) {
            setError("Please enter your email address.");
            return;
        }

        if (!validateEmail(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!password) {
            setError("Please enter your password.");
            return;
        }

        setLoading(true);

        try {
            const signInAttempt = await signIn.create({
                identifier: email,
                password,
            });

            /*
             * Normal successful login
             */
            if (signInAttempt.status === "complete") {
                await setActive({
                    session: signInAttempt.createdSessionId,
                });

                router.replace("/");
                return;
            }

            /*
             * MFA / second factor
             */
            if (signInAttempt.status === "needs_second_factor") {
                const emailCodeFactor =
                    signInAttempt.supportedSecondFactors?.find(
                        (
                            factor
                        ): factor is EmailCodeFactor =>
                            factor.strategy === "email_code"
                    );

                if (emailCodeFactor) {
                    await signIn.prepareSecondFactor({
                        strategy: "email_code",
                        emailAddressId:
                            emailCodeFactor.emailAddressId,
                    });

                    setShowEmailCode(true);
                    return;
                }

                setError(
                    "Additional verification is required, but email verification is unavailable."
                );

                return;
            }

            setError(
                "Additional verification is required to complete sign in."
            );
        } catch (err) {
            console.error("Sign in error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    /*
     * -----------------------------------------
     * GOOGLE SIGN IN
     * -----------------------------------------
     */
    const onGooglePress = async () => {
        if (loading) return;

        setError("");
        setLoading(true);

        try {
            /*
             * On web Clerk can use the current page as the
             * redirect destination.
             *
             * On native we create an Expo redirect URI.
             */
            const redirectUrl =
                Platform.OS === "web"
                    ? window.location.href
                    : undefined;

            const {
                createdSessionId,
                setActive: setSSOActive,
            } = await startSSOFlow({
                strategy: "oauth_google",
                ...(redirectUrl ? { redirectUrl } : {}),
            });

            /*
             * Google authentication succeeded.
             *
             * Activate the Clerk session BEFORE navigating.
             */
            if (createdSessionId && setSSOActive) {
                await setSSOActive({
                    session: createdSessionId,
                });

                /*
                 * Give Clerk one tick to update its session
                 * state before replacing the route.
                 */
                await new Promise((resolve) =>
                    setTimeout(resolve, 50)
                );

                router.replace("/");
            }
        } catch (err) {
            console.error("Google sign in error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    /*
     * -----------------------------------------
     * SECOND FACTOR VERIFICATION
     * -----------------------------------------
     */
    const onVerifyPress = async () => {
        if (!isLoaded || loading) return;

        const verificationCode = code.trim();

        if (!verificationCode) {
            setError("Please enter the verification code.");
            return;
        }

        if (verificationCode.length !== 6) {
            setError("Please enter the 6-digit verification code.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const attempt = await signIn.attemptSecondFactor({
                strategy: "email_code",
                code: verificationCode,
            });

            if (attempt.status === "complete") {
                await setActive({
                    session: attempt.createdSessionId,
                });

                router.replace("/");
                return;
            }

            setError(
                "Verification is not complete yet. Please try again."
            );
        } catch (err) {
            console.error("Verification error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    const onBackPress = () => {
        if (loading) return;

        if (showEmailCode) {
            setShowEmailCode(false);
            setCode("");
            setError("");
            return;
        }

        router.back();
    };

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top", "bottom"]}
        >
            <KeyboardAvoidingView
                style={styles.keyboard}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        {/* Back */}
                        <TouchableOpacity
                            onPress={onBackPress}
                            style={styles.backButton}
                            hitSlop={12}
                            disabled={loading}
                        >
                            <Ionicons
                                name="arrow-back"
                                size={23}
                                color={COLORS.primary}
                            />
                        </TouchableOpacity>

                        {!showEmailCode ? (
                            <View style={styles.formContainer}>
                                {/* Header */}
                                <View style={styles.header}>
                                    <View style={styles.logoCircle}>
                                        <Ionicons
                                            name="person-outline"
                                            size={26}
                                            color={COLORS.primary}
                                        />
                                    </View>

                                    <Text style={styles.title}>
                                        Welcome Back
                                    </Text>

                                    <Text style={styles.subtitle}>
                                        Sign in to continue to RenewX
                                    </Text>
                                </View>

                                {/* Error */}
                                {error ? (
                                    <View
                                        style={
                                            styles.errorContainer
                                        }
                                    >
                                        <Ionicons
                                            name="alert-circle-outline"
                                            size={19}
                                            color={COLORS.error}
                                        />

                                        <Text
                                            style={styles.errorText}
                                        >
                                            {error}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Google */}
                                <Pressable
                                    onPress={onGooglePress}
                                    disabled={loading}
                                    style={({ pressed }) => [
                                        styles.googleButton,
                                        pressed &&
                                            !loading &&
                                            styles.pressed,
                                    ]}
                                >
                                    <Ionicons
                                        name="logo-google"
                                        size={19}
                                        color="#4285F4"
                                    />

                                    <Text
                                        style={
                                            styles.googleButtonText
                                        }
                                    >
                                        Continue with Google
                                    </Text>
                                </Pressable>

                                {/* Divider */}
                                <View style={styles.dividerContainer}>
                                    <View
                                        style={styles.divider}
                                    />

                                    <Text
                                        style={styles.dividerText}
                                    >
                                        OR
                                    </Text>

                                    <View
                                        style={styles.divider}
                                    />
                                </View>

                                {/* Email */}
                                <View style={styles.field}>
                                    <Text style={styles.label}>
                                        Email
                                    </Text>

                                    <TextInput
                                        style={styles.input}
                                        placeholder="user@example.com"
                                        placeholderTextColor="#999"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="email-address"
                                        textContentType="emailAddress"
                                        autoComplete="email"
                                        value={emailAddress}
                                        editable={!loading}
                                        onChangeText={(value) => {
                                            setEmailAddress(
                                                value
                                            );

                                            if (error) {
                                                setError("");
                                            }
                                        }}
                                    />
                                </View>

                                {/* Password */}
                                <View style={styles.field}>
                                    <Text style={styles.label}>
                                        Password
                                    </Text>

                                    <View
                                        style={
                                            styles.passwordContainer
                                        }
                                    >
                                        <TextInput
                                            style={
                                                styles.passwordInput
                                            }
                                            placeholder="Enter your password"
                                            placeholderTextColor="#999"
                                            secureTextEntry={
                                                !showPassword
                                            }
                                            textContentType="password"
                                            autoComplete="password"
                                            value={password}
                                            editable={!loading}
                                            onChangeText={(
                                                value
                                            ) => {
                                                setPassword(
                                                    value
                                                );

                                                if (error) {
                                                    setError("");
                                                }
                                            }}
                                        />

                                        <TouchableOpacity
                                            onPress={() =>
                                                setShowPassword(
                                                    (prev) =>
                                                        !prev
                                                )
                                            }
                                            style={
                                                styles.eyeButton
                                            }
                                            hitSlop={10}
                                            disabled={loading}
                                        >
                                            <Ionicons
                                                name={
                                                    showPassword
                                                        ? "eye-off-outline"
                                                        : "eye-outline"
                                                }
                                                size={21}
                                                color="#777"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Forgot password */}
                                <TouchableOpacity
                                    onPress={() =>
                                        router.push(
                                            "/forgot-password"
                                        )
                                    }
                                    style={
                                        styles.forgotButton
                                    }
                                    disabled={loading}
                                >
                                    <Text
                                        style={
                                            styles.forgotText
                                        }
                                    >
                                        Forgot password?
                                    </Text>
                                </TouchableOpacity>

                                {/* Sign In */}
                                <Pressable
                                    onPress={onSignInPress}
                                    disabled={
                                        loading ||
                                        !emailAddress.trim() ||
                                        !password
                                    }
                                    style={({ pressed }) => [
                                        styles.primaryButton,
                                        (loading ||
                                            !emailAddress.trim() ||
                                            !password) &&
                                            styles.disabledButton,
                                        pressed &&
                                            !loading &&
                                            styles.pressed,
                                    ]}
                                >
                                    {loading ? (
                                        <ActivityIndicator
                                            color="#FFFFFF"
                                        />
                                    ) : (
                                        <Text
                                            style={
                                                styles.primaryButtonText
                                            }
                                        >
                                            Sign In
                                        </Text>
                                    )}
                                </Pressable>

                                {/* Signup */}
                                <View
                                    style={
                                        styles.signupContainer
                                    }
                                >
                                    <Text
                                        style={
                                            styles.signupNormal
                                        }
                                    >
                                        Don't have an account?{" "}
                                    </Text>

                                    <Link href="/sign-up">
                                        <Text
                                            style={
                                                styles.signupLink
                                            }
                                        >
                                            Sign up
                                        </Text>
                                    </Link>
                                </View>
                            </View>
                        ) : (
                            <View
                                style={styles.formContainer}
                            >
                                {/* Verification */}
                                <View style={styles.header}>
                                    <View
                                        style={
                                            styles.logoCircle
                                        }
                                    >
                                        <Ionicons
                                            name="shield-checkmark-outline"
                                            size={28}
                                            color={
                                                COLORS.primary
                                            }
                                        />
                                    </View>

                                    <Text
                                        style={styles.title}
                                    >
                                        Verify Email
                                    </Text>

                                    <Text
                                        style={
                                            styles.subtitle
                                        }
                                    >
                                        Enter the 6-digit code sent
                                        to{" "}
                                        {emailAddress}
                                    </Text>
                                </View>

                                {/* Error */}
                                {error ? (
                                    <View
                                        style={
                                            styles.errorContainer
                                        }
                                    >
                                        <Ionicons
                                            name="alert-circle-outline"
                                            size={19}
                                            color={COLORS.error}
                                        />

                                        <Text
                                            style={
                                                styles.errorText
                                            }
                                        >
                                            {error}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Code */}
                                <View style={styles.field}>
                                    <Text style={styles.label}>
                                        Verification Code
                                    </Text>

                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.codeInput,
                                        ]}
                                        placeholder="123456"
                                        placeholderTextColor="#999"
                                        keyboardType="number-pad"
                                        textContentType="oneTimeCode"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={code}
                                        editable={!loading}
                                        onChangeText={(value) => {
                                            setCode(
                                                value.replace(
                                                    /[^0-9]/g,
                                                    ""
                                                )
                                            );

                                            if (error) {
                                                setError("");
                                            }
                                        }}
                                    />
                                </View>

                                {/* Verify */}
                                <Pressable
                                    onPress={onVerifyPress}
                                    disabled={
                                        loading ||
                                        code.length !== 6
                                    }
                                    style={({ pressed }) => [
                                        styles.primaryButton,
                                        (loading ||
                                            code.length !==
                                                6) &&
                                            styles.disabledButton,
                                        pressed &&
                                            !loading &&
                                            styles.pressed,
                                    ]}
                                >
                                    {loading ? (
                                        <ActivityIndicator
                                            color="#FFFFFF"
                                        />
                                    ) : (
                                        <Text
                                            style={
                                                styles.primaryButtonText
                                            }
                                        >
                                            Verify
                                        </Text>
                                    )}
                                </Pressable>

                                <TouchableOpacity
                                    onPress={() => {
                                        setShowEmailCode(
                                            false
                                        );
                                        setCode("");
                                        setError("");
                                    }}
                                    style={
                                        styles.backToSignIn
                                    }
                                    disabled={loading}
                                >
                                    <Text
                                        style={
                                            styles.backToSignInText
                                        }
                                    >
                                        Back to sign in
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    keyboard: {
        flex: 1,
    },

    scroll: {
        flex: 1,
    },

    /*
     * flexGrow + justifyContent center is the important
     * part here.
     *
     * It keeps the auth form vertically centered on large
     * screens, while still allowing it to scroll on smaller
     * screens when the keyboard appears.
     */
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        paddingVertical: 32,
    },

    container: {
        width: "100%",
        maxWidth: 430,
        alignSelf: "center",
        paddingHorizontal: 28,
        position: "relative",
    },

    backButton: {
        position: "absolute",
        left: 28,
        top: -4,
        zIndex: 10,
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F7F7F7",
    },

    formContainer: {
        width: "100%",
        paddingTop: 45,
    },

    header: {
        alignItems: "center",
        marginBottom: 28,
    },

    logoCircle: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: "#F4F4F6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 17,
    },

    title: {
        fontSize: 27,
        lineHeight: 33,
        fontWeight: "700",
        color: "#111111",
        textAlign: "center",
        marginBottom: 7,
    },

    subtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: "#777777",
        textAlign: "center",
        maxWidth: 310,
    },

    errorContainer: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF5F5",
        borderWidth: 1,
        borderColor: "#FFE1E1",
        borderRadius: 12,
        paddingHorizontal: 13,
        paddingVertical: 11,
        marginBottom: 16,
    },

    errorText: {
        flex: 1,
        marginLeft: 8,
        color: "#D44747",
        fontSize: 12,
        lineHeight: 17,
    },

    googleButton: {
        width: "100%",
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E2E2",
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 21,
    },

    googleButtonText: {
        marginLeft: 10,
        color: "#222222",
        fontSize: 14,
        fontWeight: "600",
    },

    dividerContainer: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 22,
    },

    divider: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#E6E6E6",
    },

    dividerText: {
        marginHorizontal: 14,
        color: "#999999",
        fontSize: 11,
        fontWeight: "600",
    },

    field: {
        width: "100%",
        marginBottom: 17,
    },

    label: {
        color: "#202020",
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 8,
    },

    input: {
        width: "100%",
        height: 52,
        borderRadius: 12,
        backgroundColor: "#F7F7F8",
        paddingHorizontal: 15,
        color: "#151515",
        fontSize: 14,
        borderWidth: 1,
        borderColor: "#EEEEEF",
    },

    passwordContainer: {
        width: "100%",
        height: 52,
        borderRadius: 12,
        backgroundColor: "#F7F7F8",
        borderWidth: 1,
        borderColor: "#EEEEEF",
        flexDirection: "row",
        alignItems: "center",
    },

    passwordInput: {
        flex: 1,
        height: "100%",
        paddingHorizontal: 15,
        paddingRight: 8,
        color: "#151515",
        fontSize: 14,
    },

    eyeButton: {
        width: 48,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
    },

    forgotButton: {
        alignSelf: "flex-end",
        marginTop: -3,
        marginBottom: 20,
    },

    forgotText: {
        color: "#666666",
        fontSize: 12,
        fontWeight: "600",
    },

    primaryButton: {
        width: "100%",
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 25,
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },

    disabledButton: {
        backgroundColor: "#CFCFD2",
    },

    pressed: {
        opacity: 0.82,
        transform: [{ scale: 0.99 }],
    },

    signupContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 5,
    },

    signupNormal: {
        color: "#777777",
        fontSize: 13,
    },

    signupLink: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: "700",
    },

    codeInput: {
        textAlign: "center",
        fontSize: 21,
        fontWeight: "600",
        letterSpacing: 6,
    },

    backToSignIn: {
        alignItems: "center",
        paddingVertical: 10,
    },

    backToSignInText: {
        color: "#777777",
        fontSize: 13,
        fontWeight: "600",
    },
});