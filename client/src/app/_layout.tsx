import { Stack, useRouter } from "expo-router";
import "../../global.css";
import React, { useEffect } from "react";
import { ClerkProvider } from "@clerk/expo";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { CartProvider } from "../../context/CartContext";
import { WishlistProvider } from "../../context/WishListContext";
import { RefreshProvider } from "../../context/RefreshContext";
import { NotificationProvider } from "../../context/NotificationContext";
import { setupNotificationListeners } from "../../services/notifications";

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function NotificationNavHandler() {
  const router = useRouter();

  useEffect(() => {
    const cleanup = setupNotificationListeners({
      onResponse: (response) => {
        const data = response?.notification?.request?.content?.data;
        if (data?.type === "ORDER_UPDATE" || data?.orderId) {
          router.push("/orders" as any);
        } else if (data?.url) {
          router.push(data.url as any);
        }
      },
    });

    return cleanup;
  }, [router]);

  return null;
}

export default function RootLayout() {
  if (!clerkPublishableKey) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured.");
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RefreshProvider>
          <CartProvider>
            <WishlistProvider>
              <NotificationProvider>
                <NotificationNavHandler />
                <Stack screenOptions={{ headerShown: false }} />
                <Toast />
              </NotificationProvider>
            </WishlistProvider>
          </CartProvider>
        </RefreshProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
