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

const BLACK = "#111111";
const TEXT = "#111111";
const MUTED = "#777777";
const BORDER = "#E8E8E8";

const ACCOUNT_ACTIONS = [
  { title: "Orders", subtitle: "Track and manage your orders", icon: "bag-handle-outline" as const, route: "/orders" },
  { title: "Favorites", subtitle: "View your saved products", icon: "heart-outline" as const, route: "/favorites" },
  { title: "Shipping Addresses", subtitle: "Manage your delivery addresses", icon: "location-outline" as const, route: "/addresses" },
  { title: "My Reviews", subtitle: "View your product reviews", icon: "star-outline" as const, route: "/reviews" },
  { title: "Settings", subtitle: "Manage your account preferences", icon: "settings-outline" as const, route: "/settings" },
];

export default function Profile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const contentWidth = Math.min(Math.max(width - 32, 0), 560);

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={BLACK} />
        </View>
      </SafeAreaView>
    );
  }

  const firstName = user?.firstName?.trim() || "User";
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "RenewX User";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const isAdmin = user?.publicMetadata?.role === "admin";

  const go = (route: string) => router.push(route as never);

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
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
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { width: contentWidth, alignSelf: "center" },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {isSignedIn && user ? (
          <>
            <View style={styles.accountHero}>
              {user.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
              )}

              <Text style={styles.name}>{displayName}</Text>
              {email ? <Text style={styles.email}>{email}</Text> : null}

              {isAdmin ? (
                <Pressable
                  onPress={() => go("/admin")}
                  style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.adminText}>Admin Dashboard</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>ACCOUNT</Text>

              {ACCOUNT_ACTIONS.map((action) => (
                <Pressable
                  key={action.title}
                  onPress={() => go(action.route)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.iconBox}>
                    <Ionicons name={action.icon} size={22} color={BLACK} />
                  </View>

                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{action.title}</Text>
                    <Text style={styles.rowSubtitle}>{action.subtitle}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#999999" />
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
            >
              <Ionicons name="log-out-outline" size={20} color="#D93025" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.guestHero}>
              <View style={styles.guestAvatar}>
                <Ionicons name="person-outline" size={48} color="#444444" />
              </View>

              <Text style={styles.guestTitle}>Welcome to RenewX</Text>
              <Text style={styles.guestSubtitle}>
                Sign in to access your account, orders, favorites and more.
              </Text>

              <Pressable
                onPress={() => go("/sign-in")}
                style={({ pressed }) => [styles.signInButton, pressed && styles.signInPressed]}
              >
                <Text style={styles.signInButtonText}>Sign In / Create Account</Text>
                <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>EXPLORE RENEWX</Text>

              <Pressable
                onPress={() => go("/favorites")}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.iconBox}>
                  <Ionicons name="heart-outline" size={22} color={BLACK} />
                </View>

                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>Favorites</Text>
                  <Text style={styles.rowSubtitle}>View your saved products</Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#999999" />
              </Pressable>
            </View>
          </>
        )}

        <Text style={styles.footer}>RenewX</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    height: 62,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: TEXT },

  scroll: { flex: 1, backgroundColor: "#F8F8F8" },
  content: { paddingTop: 30, paddingBottom: 35 },

  accountHero: { alignItems: "center", paddingHorizontal: 16, paddingBottom: 30 },
  guestHero: { alignItems: "center", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30 },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EEEEEE",
    marginBottom: 15,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EDEDEF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  avatarLetter: { fontSize: 34, fontWeight: "700", color: BLACK },

  guestAvatar: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: "#ECECEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  name: { fontSize: 27, lineHeight: 34, fontWeight: "700", color: TEXT, textAlign: "center" },
  email: { marginTop: 5, fontSize: 14, color: MUTED, textAlign: "center" },

  guestTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
  },
  guestSubtitle: {
    marginTop: 10,
    maxWidth: 430,
    fontSize: 15,
    lineHeight: 23,
    color: MUTED,
    textAlign: "center",
  },

  signInButton: {
    width: "100%",
    maxWidth: 390,
    minHeight: 54,
    marginTop: 24,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  signInButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  signInPressed: { backgroundColor: "#333333", borderColor: "#333333" },

  adminButton: {
    minHeight: 42,
    marginTop: 16,
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: BLACK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  adminText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  cardTitle: {
    paddingHorizontal: 19,
    paddingTop: 18,
    paddingBottom: 12,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#777777",
  },

  row: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },
  rowPressed: { backgroundColor: "#F6F6F6" },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: "700", color: TEXT },
  rowSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, color: MUTED },

  signOut: {
    height: 52,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: "#FFF8F8",
    borderWidth: 1,
    borderColor: "#F1D8D8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutPressed: { backgroundColor: "#FFF0F0" },
  signOutText: { fontSize: 15, fontWeight: "700", color: "#D93025" },

  pressed: { opacity: 0.82 },
  footer: { marginTop: 26, textAlign: "center", color: "#AAAAAA", fontSize: 13 },
});
