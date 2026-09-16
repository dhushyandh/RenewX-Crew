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
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function SignInPage() {
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

            if (signInAttempt.status === "complete") {
                await setActive({
                    session: signInAttempt.createdSessionId,
                });
                router.replace("/");
                return;
            }

            if (signInAttempt.status === "needs_second_factor") {
                const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
                    (factor): factor is EmailCodeFactor => factor.strategy === "email_code"
                );

                if (emailCodeFactor) {
                    await signIn.prepareSecondFactor({
                        strategy: "email_code",
                        emailAddressId: emailCodeFactor.emailAddressId,
                    });
                    setShowEmailCode(true);
                    return;
                }

                setError("Additional verification is required, but email verification is unavailable.");
                return;
            }

            setError("Additional verification is required to complete sign in.");
        } catch (err) {
            console.error("Sign in error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    const onGooglePress = async () => {
        if (loading) return;
        setError("");
        setLoading(true);

        try {
            const redirectUrl = Platform.OS === "web" ? window.location.href : undefined;
            const { createdSessionId, setActive: setSSOActive } = await startSSOFlow({
                strategy: "oauth_google",
                ...(redirectUrl ? { redirectUrl } : {}),
            });

            if (createdSessionId && setSSOActive) {
                await setSSOActive({
                    session: createdSessionId,
                });
                await new Promise((resolve) => setTimeout(resolve, 50));
                router.replace("/");
            }
        } catch (err) {
            console.error("Google sign in error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    const onVerifyPress = async () => {
        if (!isLoaded || loading) return;

        const verificationCode = code.trim();
        if (!verificationCode || verificationCode.length !== 6) {
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

            setError("Verification is not complete yet. Please try again.");
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
        <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="flex-1 px-6 pt-4 max-w-md w-full self-center">
                        {/* Back Button */}
                        <TouchableOpacity
                            onPress={onBackPress}
                            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mb-6"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            disabled={loading}
                        >
                            <Ionicons name="arrow-back" size={22} color="#111111" />
                        </TouchableOpacity>

                        {!showEmailCode ? (
                            <View className="w-full">
                                {/* Header */}
                                <View className="items-center mb-8">
                                    <View className="w-16 h-16 rounded-2xl bg-gray-100 items-center justify-center mb-4">
                                        <Ionicons name="person-outline" size={30} color="#111111" />
                                    </View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        Welcome Back
                                    </Text>
                                    <Text className="text-sm text-gray-500 mt-1 text-center">
                                        Sign in to continue to RenewX
                                    </Text>
                                </View>

                                {/* Error message */}
                                {error ? (
                                    <View className="bg-red-50 border border-red-200 rounded-xl p-3 flex-row items-center mb-5">
                                        <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                                        <Text className="text-red-700 text-xs font-medium ml-2 flex-1">
                                            {error}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Google Button */}
                                <TouchableOpacity
                                    onPress={onGooglePress}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                    className="w-full py-3.5 px-4 rounded-2xl bg-white border border-gray-200 flex-row items-center justify-center mb-6 shadow-sm"
                                >
                                    <Ionicons name="logo-google" size={20} color="#4285F4" />
                                    <Text className="text-gray-800 font-semibold text-sm ml-3">
                                        Continue with Google
                                    </Text>
                                </TouchableOpacity>

                                {/* Divider */}
                                <View className="flex-row items-center mb-6">
                                    <View className="flex-1 h-[1px] bg-gray-200" />
                                    <Text className="mx-4 text-xs font-semibold text-gray-400 uppercase">
                                        or sign in with email
                                    </Text>
                                    <View className="flex-1 h-[1px] bg-gray-200" />
                                </View>

                                {/* Email Field */}
                                <View className="mb-4">
                                    <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Email
                                    </Text>
                                    <TextInput
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900"
                                        placeholder="user@example.com"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="email-address"
                                        textContentType="emailAddress"
                                        autoComplete="email"
                                        value={emailAddress}
                                        editable={!loading}
                                        onChangeText={(value) => {
                                            setEmailAddress(value);
                                            if (error) setError("");
                                        }}
                                    />
                                </View>

                                {/* Password Field */}
                                <View className="mb-2">
                                    <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Password
                                    </Text>
                                    <View className="w-full bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-4">
                                        <TextInput
                                            className="flex-1 py-3.5 text-sm text-gray-900"
                                            placeholder="Enter your password"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showPassword}
                                            textContentType="password"
                                            autoComplete="password"
                                            value={password}
                                            editable={!loading}
                                            onChangeText={(value) => {
                                                setPassword(value);
                                                if (error) setError("");
                                            }}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword((prev) => !prev)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            disabled={loading}
                                        >
                                            <Ionicons
                                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color="#6B7280"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Forgot Password */}
                                <TouchableOpacity
                                    onPress={() => router.push("/forgot-password" as never)}
                                    className="self-end my-3"
                                    disabled={loading}
                                >
                                    <Text className="text-xs font-semibold text-gray-600">
                                        Forgot password?
                                    </Text>
                                </TouchableOpacity>

                                {/* Sign In Button */}
                                <TouchableOpacity
                                    onPress={onSignInPress}
                                    disabled={loading || !emailAddress.trim() || !password}
                                    activeOpacity={0.85}
                                    className={`w-full py-4 rounded-2xl items-center justify-center mt-2 shadow-sm ${
                                        loading || !emailAddress.trim() || !password
                                            ? "bg-gray-300"
                                            : "bg-black"
                                    }`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text className="text-white font-bold text-base">
                                            Sign In
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {/* Sign Up Link */}
                                <View className="flex-row justify-center items-center mt-6">
                                    <Text className="text-xs text-gray-500">
                                        Don't have an account?{" "}
                                    </Text>
                                    <Link href="/sign-up">
                                        <Text className="text-xs font-bold text-black underline">
                                            Sign up
                                        </Text>
                                    </Link>
                                </View>
                            </View>
                        ) : (
                            /* Verification Code Screen */
                            <View className="w-full">
                                <View className="items-center mb-8">
                                    <View className="w-16 h-16 rounded-2xl bg-gray-100 items-center justify-center mb-4">
                                        <Ionicons name="shield-checkmark-outline" size={30} color="#111111" />
                                    </View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        Verify Email
                                    </Text>
                                    <Text className="text-sm text-gray-500 mt-1 text-center">
                                        Enter the 6-digit code sent to{" "}
                                        <Text className="font-semibold text-gray-800">{emailAddress}</Text>
                                    </Text>
                                </View>

                                {error ? (
                                    <View className="bg-red-50 border border-red-200 rounded-xl p-3 flex-row items-center mb-5">
                                        <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                                        <Text className="text-red-700 text-xs font-medium ml-2 flex-1">
                                            {error}
                                        </Text>
                                    </View>
                                ) : null}

                                <View className="mb-6">
                                    <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Verification Code
                                    </Text>
                                    <TextInput
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-center text-xl font-bold tracking-widest text-gray-900"
                                        placeholder="123456"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="number-pad"
                                        textContentType="oneTimeCode"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={code}
                                        editable={!loading}
                                        onChangeText={(value) => {
                                            setCode(value.replace(/[^0-9]/g, ""));
                                            if (error) setError("");
                                        }}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={onVerifyPress}
                                    disabled={loading || code.length !== 6}
                                    activeOpacity={0.85}
                                    className={`w-full py-4 rounded-2xl items-center justify-center shadow-sm ${
                                        loading || code.length !== 6 ? "bg-gray-300" : "bg-black"
                                    }`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text className="text-white font-bold text-base">
                                            Verify
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        setShowEmailCode(false);
                                        setCode("");
                                        setError("");
                                    }}
                                    className="items-center mt-6"
                                    disabled={loading}
                                >
                                    <Text className="text-xs font-semibold text-gray-600">
                                        ← Back to Sign In
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