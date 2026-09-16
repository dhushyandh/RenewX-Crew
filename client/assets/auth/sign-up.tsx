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
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpPage() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const { startSSOFlow } = useSSO();
    const router = useRouter();

    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [emailAddress, setEmailAddress] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [code, setCode] = React.useState("");

    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const [showVerification, setShowVerification] = React.useState(false);

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
            setError("Password must contain at least 8 characters.");
            return false;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return false;
        }

        return true;
    };

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
            console.error("Google sign up error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    const onVerifyPress = async () => {
        if (!isLoaded || loading || !code.trim()) return;

        setError("");
        setLoading(true);

        try {
            const verificationAttempt = await signUp.attemptEmailAddressVerification({
                code: code.trim(),
            });

            if (verificationAttempt.status === "complete") {
                await setActive({
                    session: verificationAttempt.createdSessionId,
                });
                router.replace("/");
            } else {
                setError("Verification is not complete yet. Please follow the remaining steps.");
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
                        {/* Back button */}
                        <TouchableOpacity
                            onPress={onBackPress}
                            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mb-6"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            disabled={loading}
                        >
                            <Ionicons name="arrow-back" size={22} color="#111111" />
                        </TouchableOpacity>

                        {!showVerification ? (
                            <View className="w-full">
                                {/* Header */}
                                <View className="items-center mb-8">
                                    <View className="w-16 h-16 rounded-2xl bg-gray-100 items-center justify-center mb-4">
                                        <Ionicons name="person-add-outline" size={30} color="#111111" />
                                    </View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        Create Account
                                    </Text>
                                    <Text className="text-sm text-gray-500 mt-1 text-center">
                                        Join RenewX and start shopping
                                    </Text>
                                </View>

                                {/* Error */}
                                {error ? (
                                    <View className="bg-red-50 border border-red-200 rounded-xl p-3 flex-row items-center mb-5">
                                        <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                                        <Text className="text-red-700 text-xs font-medium ml-2 flex-1">
                                            {error}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Google */}
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
                                        or sign up with email
                                    </Text>
                                    <View className="flex-1 h-[1px] bg-gray-200" />
                                </View>

                                {/* Names Row */}
                                <View className="flex-row space-x-3 mb-4">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                            First Name *
                                        </Text>
                                        <TextInput
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900"
                                            placeholder="John"
                                            placeholderTextColor="#9CA3AF"
                                            value={firstName}
                                            editable={!loading}
                                            onChangeText={(value) => {
                                                setFirstName(value);
                                                if (error) setError("");
                                            }}
                                        />
                                    </View>
                                    <View className="flex-1 ml-1">
                                        <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                            Last Name
                                        </Text>
                                        <TextInput
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900"
                                            placeholder="Doe"
                                            placeholderTextColor="#9CA3AF"
                                            value={lastName}
                                            editable={!loading}
                                            onChangeText={(value) => {
                                                setLastName(value);
                                                if (error) setError("");
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* Email */}
                                <View className="mb-4">
                                    <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Email *
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

                                {/* Password */}
                                <View className="mb-4">
                                    <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Password * (min 8 chars)
                                    </Text>
                                    <View className="w-full bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-4">
                                        <TextInput
                                            className="flex-1 py-3.5 text-sm text-gray-900"
                                            placeholder="Create a strong password"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showPassword}
                                            textContentType="newPassword"
                                            autoComplete="new-password"
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

                                {/* Confirm Password */}
                                <View className="mb-6">
                                    <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Confirm Password *
                                    </Text>
                                    <View className="w-full bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-4">
                                        <TextInput
                                            className="flex-1 py-3.5 text-sm text-gray-900"
                                            placeholder="Re-enter your password"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showConfirmPassword}
                                            textContentType="newPassword"
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            editable={!loading}
                                            onChangeText={(value) => {
                                                setConfirmPassword(value);
                                                if (error) setError("");
                                            }}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowConfirmPassword((prev) => !prev)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            disabled={loading}
                                        >
                                            <Ionicons
                                                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color="#6B7280"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Create Account Button */}
                                <TouchableOpacity
                                    onPress={onSignUpPress}
                                    disabled={loading || !firstName || !emailAddress || !password || !confirmPassword}
                                    activeOpacity={0.85}
                                    className={`w-full py-4 rounded-2xl items-center justify-center shadow-sm ${
                                        loading || !firstName || !emailAddress || !password || !confirmPassword
                                            ? "bg-gray-300"
                                            : "bg-black"
                                    }`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text className="text-white font-bold text-base">
                                            Create Account
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {/* Sign In Link */}
                                <View className="flex-row justify-center items-center mt-6">
                                    <Text className="text-xs text-gray-500">
                                        Already have an account?{" "}
                                    </Text>
                                    <Link href="/sign-in">
                                        <Text className="text-xs font-bold text-black underline">
                                            Sign in
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
                                            Complete Sign Up
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        setShowVerification(false);
                                        setCode("");
                                        setError("");
                                    }}
                                    className="items-center mt-6"
                                    disabled={loading}
                                >
                                    <Text className="text-xs font-semibold text-gray-600">
                                        ← Back to Sign Up
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