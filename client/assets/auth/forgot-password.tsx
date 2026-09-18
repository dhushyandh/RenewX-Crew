import { COLORS } from "@/constants";
import { useSignIn } from "@clerk/expo/legacy";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export default function ForgotPasswordPage() {
    const { signIn, setActive, isLoaded } = useSignIn();
    const router = useRouter();

    const [emailAddress, setEmailAddress] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [code, setCode] = React.useState("");

    const [showPassword, setShowPassword] = React.useState(false);
    const [successfulCreation, setSuccessfulCreation] = React.useState(false);

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

    const onRequestReset = async () => {
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

        setLoading(true);

        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: email,
            });
            setSuccessfulCreation(true);
            setError("");
        } catch (err: any) {
            console.error("Forgot password request error:", err);
            const clerkErr = getClerkError(err);
            
            // Handle Google OAuth users trying to reset password
            if (
                clerkErr.toLowerCase().includes("verification strategy is not valid") || 
                err?.errors?.[0]?.code === "strategy_for_user_invalid"
            ) {
                setError("This account uses Google Sign-In. Please go back and sign in with Google instead of resetting a password.");
            } else {
                setError(clerkErr);
            }
        } finally {
            setLoading(false);
        }
    };

    const onResetPassword = async () => {
        if (!isLoaded || loading) return;

        setError("");
        const verificationCode = code.trim();

        if (!verificationCode) {
            setError("Please enter the verification code.");
            return;
        }

        if (!password) {
            setError("Please enter a new password.");
            return;
        }

        if (password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            const attempt = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code: verificationCode,
                password,
            });

            if (attempt.status === "complete") {
                await setActive({ session: attempt.createdSessionId });
                router.replace("/");
            } else {
                console.error("Reset password failed - status not complete:", attempt);
                setError("Unable to reset password. Please try again.");
            }
        } catch (err) {
            console.error("Forgot password reset error:", err);
            setError(getClerkError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8F8F8]">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView
                    contentContainerClassName="flex-grow p-6 pt-8 pb-12"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/sign-in" as never);
                            }
                        }}
                        className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center mb-8"
                    >
                        <Ionicons name="arrow-back" size={20} color="#111" />
                    </TouchableOpacity>

                    <View className="mb-8">
                        <Text className="text-3xl font-extrabold text-[#111] mb-2 tracking-tight">
                            Reset Password
                        </Text>
                        <Text className="text-[15px] text-gray-500 leading-6">
                            {!successfulCreation 
                                ? "Enter your email address and we'll send you a code to reset your password."
                                : "Check your email for the verification code to create a new password."}
                        </Text>
                    </View>

                    {error ? (
                        <View className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex-row items-center">
                            <Ionicons name="alert-circle" size={20} color="#DC2626" />
                            <Text className="flex-1 ml-2 text-sm text-red-600 font-medium">
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    {!successfulCreation ? (
                        <View className="space-y-5">
                            <View>
                                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                                    Email Address
                                </Text>
                                <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 h-14">
                                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                                    <TextInput
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={emailAddress}
                                        onChangeText={(text) => {
                                            setEmailAddress(text);
                                            setError("");
                                        }}
                                        placeholder="Enter your email"
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 h-full ml-3 text-base text-[#111]"
                                        editable={!loading}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={onRequestReset}
                                disabled={loading}
                                activeOpacity={0.8}
                                className="w-full h-14 bg-black rounded-2xl items-center justify-center mt-2 shadow-sm"
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-base">
                                        Send Reset Code
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="space-y-5">
                            <View>
                                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                                    Verification Code
                                </Text>
                                <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 h-14">
                                    <Ionicons name="keypad-outline" size={20} color="#9CA3AF" />
                                    <TextInput
                                        keyboardType="number-pad"
                                        value={code}
                                        onChangeText={(text) => {
                                            setCode(text);
                                            setError("");
                                        }}
                                        placeholder="6-digit code"
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 h-full ml-3 text-base text-[#111]"
                                        editable={!loading}
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                                    New Password
                                </Text>
                                <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 h-14">
                                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                                    <TextInput
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            setError("");
                                        }}
                                        placeholder="Enter new password"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry={!showPassword}
                                        className="flex-1 h-full ml-3 text-base text-[#111]"
                                        editable={!loading}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        className="p-2 -mr-2"
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-outline" : "eye-off-outline"}
                                            size={20}
                                            color="#9CA3AF"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={onResetPassword}
                                disabled={loading}
                                activeOpacity={0.8}
                                className="w-full h-14 bg-black rounded-2xl items-center justify-center mt-2 shadow-sm"
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-base">
                                        Reset Password
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
