import { COLORS } from "@/constants";
import { useSSO } from "@clerk/expo";
import { useSignUp } from "@clerk/expo/legacy";
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

WebBrowser.maybeCompleteAuthSession();

export default function Page() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const { startSSOFlow } = useSSO();
    const router = useRouter();

    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [emailAddress, setEmailAddress] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [code, setCode] = React.useState("");

    const [showPassword, setShowPassword] =
        React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        React.useState(false);

    const [showVerification, setShowVerification] =
        React.useState(false);

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const getClerkError = React.useCallback((err: any) => {
        return (
            err?.errors?.[0]?.longMessage ||
            err?.errors?.[0]?.message ||
            "Something went wrong. Please try again."
        );
    }, []);

    const validateForm = () => {
        if (!firstName.trim()) {
            setError("Please enter your first name.");
            return false;
        }

        if (!emailAddress.trim()) {
            setError("Please enter your email address.");
            return false;
        }

        if (!password) {
            setError("Please enter a password.");
            return false;
        }

        if (password.length < 8) {
            setError(
                "Password must contain at least 8 characters."
            );
            return false;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return false;
        }

        return true;
    };

    /*
     * -----------------------------------------
     * EMAIL / PASSWORD SIGN UP
     * -----------------------------------------
     */
    const onSignUpPress = async () => {
        if (!isLoaded || loading) return;

        setError("");

        if (!validateForm()) return;

        setLoading(true);

        try {
            const signUpAttempt = await signUp.create({
                firstName: firstName.trim(),
                lastName: lastName.trim() || undefined,
                emailAddress: emailAddress.trim(),
                password,
            });

            /*
             * Send email verification code.
             */
            await signUpAttempt.prepareEmailAddressVerification({
                strategy: "email_code",
            });

            setShowVerification(true);
        } catch (err) {
            console.error("Sign up error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    /*
     * -----------------------------------------
     * GOOGLE SIGN UP
     * -----------------------------------------
     */
    const onGooglePress = async () => {
        if (loading) return;

        setError("");
        setLoading(true);

        try {
            /*
             * Web:
             * Use the current page as the OAuth callback.
             *
             * Native:
             * Clerk handles the native redirect configuration.
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
             * Google authentication completed.
             * Activate the Clerk session before navigating.
             */
            if (createdSessionId && setSSOActive) {
                await setSSOActive({
                    session: createdSessionId,
                });

                /*
                 * Give Clerk a moment to synchronize the
                 * active session before changing screens.
                 */
                await new Promise((resolve) =>
                    setTimeout(resolve, 50)
                );

                router.replace("/");
            }
        } catch (err) {
            console.error("Google sign up error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    /*
     * -----------------------------------------
     * EMAIL VERIFICATION
     * -----------------------------------------
     */
    const onVerifyPress = async () => {
        if (!isLoaded || loading || !code.trim()) return;

        setError("");
        setLoading(true);

        try {
            const verificationAttempt =
                await signUp.attemptEmailAddressVerification({
                    code: code.trim(),
                });

            if (verificationAttempt.status === "complete") {
                await setActive({
                    session:
                        verificationAttempt.createdSessionId,
                });

                router.replace("/");
            } else {
                setError(
                    "Verification is not complete yet. Please follow the remaining steps."
                );
            }
        } catch (err) {
            console.error("Verification error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    const onBackPress = () => {
        if (loading) return;

        if (showVerification) {
            setShowVerification(false);
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
                        {/* Back button */}
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

                        {!showVerification ? (
                            <View style={styles.formContainer}>
                                {/* Header */}
                                <View style={styles.header}>
                                    <View
                                        style={styles.logoCircle}
                                    >
                                        <Ionicons
                                            name="person-add-outline"
                                            size={27}
                                            color={
                                                COLORS.primary
                                            }
                                        />
                                    </View>

                                    <Text style={styles.title}>
                                        Create Account
                                    </Text>

                                    <Text
                                        style={styles.subtitle}
                                    >
                                        Join RenewX and start
                                        shopping
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
                                            color={
                                                COLORS.error
                                            }
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
                                <View
                                    style={
                                        styles.dividerContainer
                                    }
                                >
                                    <View
                                        style={styles.divider}
                                    />

                                    <Text
                                        style={
                                            styles.dividerText
                                        }
                                    >
                                        OR
                                    </Text>

                                    <View
                                        style={styles.divider}
                                    />
                                </View>

                                {/* First + Last name */}
                                <View
                                    style={
                                        styles.nameRow
                                    }
                                >
                                    <View
                                        style={
                                            styles.nameField
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.label
                                            }
                                        >
                                            First Name
                                        </Text>

                                        <TextInput
                                            style={
                                                styles.input
                                            }
                                            placeholder="John"
                                            placeholderTextColor="#999"
                                            autoCapitalize="words"
                                            autoCorrect={false}
                                            value={firstName}
                                            editable={!loading}
                                            onChangeText={(
                                                value
                                            ) => {
                                                setFirstName(
                                                    value
                                                );

                                                if (error) {
                                                    setError("");
                                                }
                                            }}
                                        />
                                    </View>

                                    <View
                                        style={
                                            styles.nameField
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.label
                                            }
                                        >
                                            Last Name
                                        </Text>

                                        <TextInput
                                            style={
                                                styles.input
                                            }
                                            placeholder="Doe"
                                            placeholderTextColor="#999"
                                            autoCapitalize="words"
                                            autoCorrect={false}
                                            value={lastName}
                                            editable={!loading}
                                            onChangeText={(
                                                value
                                            ) => {
                                                setLastName(
                                                    value
                                                );

                                                if (error) {
                                                    setError("");
                                                }
                                            }}
                                        />
                                    </View>
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
                                        onChangeText={(
                                            value
                                        ) => {
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
                                            placeholder="At least 8 characters"
                                            placeholderTextColor="#999"
                                            secureTextEntry={
                                                !showPassword
                                            }
                                            textContentType="newPassword"
                                            autoComplete="password-new"
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

                                {/* Confirm password */}
                                <View
                                    style={
                                        styles.field
                                    }
                                >
                                    <Text style={styles.label}>
                                        Confirm Password
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
                                            placeholder="Repeat your password"
                                            placeholderTextColor="#999"
                                            secureTextEntry={
                                                !showConfirmPassword
                                            }
                                            textContentType="newPassword"
                                            autoComplete="password-new"
                                            value={
                                                confirmPassword
                                            }
                                            editable={!loading}
                                            onChangeText={(
                                                value
                                            ) => {
                                                setConfirmPassword(
                                                    value
                                                );

                                                if (error) {
                                                    setError("");
                                                }
                                            }}
                                        />

                                        <TouchableOpacity
                                            onPress={() =>
                                                setShowConfirmPassword(
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
                                                    showConfirmPassword
                                                        ? "eye-off-outline"
                                                        : "eye-outline"
                                                }
                                                size={21}
                                                color="#777"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Create account */}
                                <Pressable
                                    onPress={onSignUpPress}
                                    disabled={
                                        loading ||
                                        !firstName.trim() ||
                                        !emailAddress.trim() ||
                                        !password ||
                                        !confirmPassword
                                    }
                                    style={({ pressed }) => [
                                        styles.primaryButton,
                                        (loading ||
                                            !firstName.trim() ||
                                            !emailAddress.trim() ||
                                            !password ||
                                            !confirmPassword) &&
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
                                            Create Account
                                        </Text>
                                    )}
                                </Pressable>

                                {/* Sign in */}
                                <View
                                    style={
                                        styles.signinContainer
                                    }
                                >
                                    <Text
                                        style={
                                            styles.signupNormal
                                        }
                                    >
                                        Already have an account?{" "}
                                    </Text>

                                    <Link href="/sign-in">
                                        <Text
                                            style={
                                                styles.signupLink
                                            }
                                        >
                                            Sign in
                                        </Text>
                                    </Link>
                                </View>
                            </View>
                        ) : (
                            <View
                                style={styles.formContainer}
                            >
                                {/* Verification header */}
                                <View style={styles.header}>
                                    <View
                                        style={
                                            styles.logoCircle
                                        }
                                    >
                                        <Ionicons
                                            name="mail-outline"
                                            size={29}
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
                                        We sent a verification
                                        code to{" "}
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
                                            color={
                                                COLORS.error
                                            }
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
                                        onChangeText={(
                                            value
                                        ) => {
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
                                        code.length < 6
                                    }
                                    style={({ pressed }) => [
                                        styles.primaryButton,
                                        (loading ||
                                            code.length < 6) &&
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
                                            Verify Email
                                        </Text>
                                    )}
                                </Pressable>

                                {/* Change email */}
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowVerification(
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
                                        Use a different email
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
     * This is what keeps the entire form vertically centered
     * on larger screens while still allowing scrolling on
     * smaller screens / when the keyboard is open.
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
        marginBottom: 27,
    },

    logoCircle: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: "#F4F4F6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
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

    nameRow: {
        width: "100%",
        flexDirection: "row",
        gap: 12,
        marginBottom: 17,
    },

    nameField: {
        flex: 1,
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

    primaryButton: {
        width: "100%",
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
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

    signinContainer: {
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