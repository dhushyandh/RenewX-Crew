import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";

const COLORS = {
  black: "#111111",
  white: "#FFFFFF",
  background: "#F7F7F7",
  text: "#171717",
  muted: "#777777",
  border: "#E8E8E8",
  soft: "#F0F0F2",
  danger: "#B84E4E",
};

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    id: "orders",
    title: "My Orders",
    subtitle: "Track and manage your orders",
    icon: "receipt-outline",
    route: "/orders",
  },
  {
    id: "favorites",
    title: "Favorites",
    subtitle: "Your saved products",
    icon: "heart-outline",
    route: "/favorites",
  },
  {
    id: "addresses",
    title: "Shipping Addresses",
    subtitle: "Manage your delivery addresses",
    icon: "location-outline",
    route: "/addresses",
  },
  {
    id: "reviews",
    title: "My Reviews",
    subtitle: "Products you have reviewed",
    icon: "star-outline",
    route: "/reviews",
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "Account and app preferences",
    icon: "settings-outline",
    route: "/settings",
  },
];

export default function Profile() {
  const router = useRouter();
  const clerk = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fullName = useMemo(() => {
    if (!user) return "Guest User";
    return (
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "RenewX User"
    );
  }, [user]);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const initials = useMemo(() => {
    if (!user) return "G";
    const result = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
    if (result) return result;
    return fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user, fullName]);

  const isAdmin = useMemo(() => {
    const role = user?.publicMetadata?.role;
    return typeof role === "string" && role.trim().toLowerCase() === "admin";
  }, [user]);

  const goTo = useCallback(
    (route: string) => {
      router.push(route as never);
    },
    [router],
  );

  const handleSignOut = useCallback(() => {
    if (isSigningOut) return;

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await clerk.signOut();
            } catch (error) {
              console.error("Sign out failed:", error);
              Alert.alert("Sign Out Failed", "Please try again.");
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
    );
  }, [clerk, isSigningOut]);

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={COLORS.black} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <View style={styles.content}>
            {!isSignedIn ? (
              <>
                <View style={styles.guestHero}>
                  <View style={styles.guestAvatar}>
                    <Ionicons
                      name="person-outline"
                      size={46}
                      color="#505057"
                    />
                  </View>

                  <Text style={styles.guestTitle}>Welcome to RenewX</Text>

                  <Text style={styles.guestSubtitle}>
                    Sign in to access your account, orders, favorites and more.
                  </Text>

                  <View style={styles.authButtons}>
                    <Pressable
                      onPress={() => goTo("/sign-in")}
                      style={({ pressed }) => [
                        styles.signInButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.signInText}>Sign In</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={COLORS.white}
                      />
                    </Pressable>

                    <Pressable
                      onPress={() => goTo("/sign-up")}
                      style={({ pressed }) => [
                        styles.createButton,
                        pressed && styles.createButtonPressed,
                      ]}
                    >
                      <Text style={styles.createButtonText}>
                        Create Account
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>EXPLORE RENEWX</Text>

                <View style={styles.menuCard}>
                  <Pressable
                    onPress={() => goTo("/favorites")}
                    style={({ pressed }) => [
                      styles.menuRow,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.iconBox}>
                      <Ionicons
                        name="heart-outline"
                        size={21}
                        color={COLORS.black}
                      />
                    </View>

                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>Favorites</Text>
                      <Text style={styles.rowSubtitle}>
                        View your saved products
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color="#999999"
                    />
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.profileHero}>
                  {user?.imageUrl ? (
                    <Image
                      source={{ uri: user.imageUrl }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profileAvatar}>
                      <Text style={styles.initials}>{initials}</Text>
                    </View>
                  )}

                  <Text style={styles.userName} numberOfLines={1}>
                    {fullName}
                  </Text>

                  {email ? (
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {email}
                    </Text>
                  ) : null}

                  {isAdmin ? (
                    <Pressable
                      onPress={() => goTo("/admin")}
                      style={({ pressed }) => [
                        styles.adminButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={17}
                        color={COLORS.white}
                      />
                      <Text style={styles.adminText}>Admin Panel</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={COLORS.white}
                      />
                    </Pressable>
                  ) : null}
                </View>

                <Text style={styles.sectionLabel}>ACCOUNT</Text>

                <View style={styles.menuCard}>
                  {MENU_ITEMS.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={() => goTo(item.route)}
                      style={({ pressed }) => [
                        styles.menuRow,
                        index < MENU_ITEMS.length - 1 && styles.menuDivider,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <View style={styles.iconBox}>
                        <Ionicons
                          name={item.icon}
                          size={21}
                          color={COLORS.black}
                        />
                      </View>

                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        <Text style={styles.rowSubtitle}>
                          {item.subtitle}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={19}
                        color="#999999"
                      />
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={handleSignOut}
                  disabled={isSigningOut}
                  style={({ pressed }) => [
                    styles.logoutButton,
                    pressed && !isSigningOut && styles.logoutPressed,
                  ]}
                >
                  {isSigningOut ? (
                    <ActivityIndicator size="small" color={COLORS.danger} />
                  ) : (
                    <>
                      <Ionicons
                        name="log-out-outline"
                        size={19}
                        color={COLORS.danger}
                      />
                      <Text style={styles.logoutText}>Sign Out</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}

            <Text style={styles.footer}>RenewX</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
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
    flexGrow: 1,
    paddingBottom: 32,
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  guestHero: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 30,
  },
  guestAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  guestSubtitle: {
    maxWidth: 390,
    marginTop: 9,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
    textAlign: "center",
  },
  authButtons: {
    width: "100%",
    maxWidth: 390,
    marginTop: 24,
    gap: 10,
  },
  signInButton: {
    width: "100%",
    height: 54,
    borderRadius: 14,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
  },
  signInText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  createButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "700",
  },
  createButtonPressed: {
    backgroundColor: "#F1F1F1",
  },

  sectionLabel: {
    marginBottom: 9,
    paddingHorizontal: 2,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#777777",
  },
  menuCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  menuRow: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  menuDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  iconBox: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 3,
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: "#929298",
  },
  rowPressed: {
    backgroundColor: "#F8F8F8",
  },

  profileHero: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 18,
  },
  profileImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.soft,
    marginBottom: 13,
  },
  profileAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#E8E8EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  initials: {
    fontSize: 29,
    fontWeight: "700",
    color: "#45454C",
  },
  userName: {
    maxWidth: "92%",
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  userEmail: {
    maxWidth: "92%",
    marginTop: 5,
    fontSize: 13,
    color: "#85858B",
    textAlign: "center",
  },
  adminButton: {
    height: 40,
    marginTop: 13,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.black,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  adminText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },

  logoutButton: {
    height: 52,
    marginTop: 18,
    borderRadius: 15,
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#F2DEDE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  footer: {
    marginTop: 26,
    textAlign: "center",
    color: "#B0B0B4",
    fontSize: 11,
  },
});
