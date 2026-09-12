import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";

import { COLORS } from "@/constants";

const ACCOUNT_ACTIONS = [
  {
    title: "Orders",
    subtitle: "Track and manage your orders",
    icon: "bag-handle-outline" as const,
    route: "/orders",
  },
  {
    title: "Favorites",
    subtitle: "View your saved products",
    icon: "heart-outline" as const,
    route: "/favorites",
  },
  {
    title: "Shipping Addresses",
    subtitle: "Manage your delivery addresses",
    icon: "location-outline" as const,
    route: "/addresses",
  },
  {
    title: "My Reviews",
    subtitle: "View your product reviews",
    icon: "star-outline" as const,
    route: "/reviews",
  },
  {
    title: "Settings",
    subtitle: "Manage your account preferences",
    icon: "settings-outline" as const,
    route: "/settings",
  },
];

const GUEST_ACTIONS = [
  {
    title: "Favorites",
    subtitle: "View your saved products",
    icon: "heart-outline" as const,
    route: "/favorites",
  },
];

export default function Profile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const contentWidth = Math.min(width - 32, 560);

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const firstName = user?.firstName?.trim() || "RenewX User";
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const displayName = fullName || firstName;
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const isAdmin = user?.publicMetadata?.role === "admin";

  const handleSignOut = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of your RenewX account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error("Sign out error:", error);
              Alert.alert("Unable to sign out", "Please try again.");
            }
          },
        },
      ],
    );
  };

  const renderAction = (
    action: (typeof ACCOUNT_ACTIONS)[number],
  ) => (
    <Pressable
      key={action.title}
      onPress={() => router.push(action.route as never)}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && styles.actionRowPressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={action.icon} size={22} color={COLORS.primary} />
      </View>

      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color="#999999"
      />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { width: contentWidth, alignSelf: "center" },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {isSignedIn && user ? (
          <>
            <View style={styles.profileSection}>
              {user.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <Text style={styles.welcomeTitle}>{displayName}</Text>
              {email ? (
                <Text style={styles.email}>{email}</Text>
              ) : null}

              {isAdmin ? (
                <Pressable
                  onPress={() => router.push("/admin" as never)}
                  style={({ pressed }) => [
                    styles.adminButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={17}
                    color="#FFFFFF"
                  />
                  <Text style={styles.adminButtonText}>Admin Dashboard</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>ACCOUNT</Text>
              <View style={styles.actionList}>
                {ACCOUNT_ACTIONS.map(renderAction)}
              </View>
            </View>

            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.signOutPressed,
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={COLORS.error}
              />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.guestSection}>
              <View style={styles.guestIcon}>
                <Ionicons
                  name="person-outline"
                  size={52}
                  color="#555555"
                />
              </View>

              <Text style={styles.welcomeTitle}>Welcome to RenewX</Text>
              <Text style={styles.guestDescription}>
                Sign in to access your account, orders, favorites and more.
              </Text>

              <Pressable
                onPress={() => router.push("/sign-in" as never)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Sign In / Create Account
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>EXPLORE RENEWX</Text>
              <View style={styles.actionList}>
                {GUEST_ACTIONS.map(renderAction)}
              </View>
            </View>
          </>
        )}

        <Text style={styles.footer}>RenewX</Text>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },

  scrollView: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  contentContainer: {
    paddingTop: 34,
    paddingBottom: 24,
  },

  profileSection: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  guestSection: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 34,
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    marginBottom: 18,
    backgroundColor: "#EEEEEE",
  },

  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    marginBottom: 18,
    backgroundColor: "#F0F0F2",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 38,
    fontWeight: "700",
    color: COLORS.primary,
  },

  guestIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#F0F0F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  welcomeTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "center",
  },

  email: {
    marginTop: 7,
    fontSize: 15,
    color: "#777777",
    textAlign: "center",
  },

  guestDescription: {
    maxWidth: 430,
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: "#777777",
    textAlign: "center",
  },

  primaryButton: {
    minHeight: 52,
    marginTop: 25,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    maxWidth: 390,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  adminButton: {
    minHeight: 42,
    marginTop: 17,
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  adminButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  sectionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    overflow: "hidden",
  },

  sectionLabel: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#777777",
  },

  actionList: {
    width: "100%",
  },

  actionRow: {
    width: "100%",
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
  },

  actionRowPressed: {
    backgroundColor: "#F7F7F7",
  },

  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  actionTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  actionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#777777",
  },

  signOutButton: {
    height: 52,
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0D7D7",
    backgroundColor: "#FFF8F8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  signOutPressed: {
    backgroundColor: "#FFF0F0",
  },

  signOutText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.error,
  },

  buttonPressed: {
    opacity: 0.82,
  },

  footer: {
    marginTop: 28,
    textAlign: "center",
    color: "#B0B0B0",
    fontSize: 13,
  },

  bottomSpacer: {
    height: 20,
  },
});
