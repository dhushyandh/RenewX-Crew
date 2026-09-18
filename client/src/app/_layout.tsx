import { Stack } from "expo-router";
import "../../global.css";

import { ClerkProvider } from "@clerk/expo";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { CartProvider } from "../../context/CartContext";
import { WishlistProvider } from "../../context/WishListContext";
import { RefreshProvider } from "../../context/RefreshContext";
import { NotificationProvider } from "../../context/NotificationContext";

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  if (!clerkPublishableKey) {
    throw new Error(
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured."
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RefreshProvider>
          <CartProvider>
            <WishlistProvider>
              <NotificationProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                />
                <Toast />
              </NotificationProvider>
            </WishlistProvider>
          </CartProvider>
        </RefreshProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}