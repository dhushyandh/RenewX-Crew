import axios from "axios";
import PushToken from "../models/PushToken.js";
import NotificationPreference from "../models/NotificationPreference.js";
import User from "../models/user.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessagePayload {
    to: string | string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: "default" | null;
    channelId?: string;
    priority?: "default" | "normal" | "high";
    badge?: number;
}

/**
 * Validates whether a token matches the standard Expo push token pattern.
 */
export const isExpoPushToken = (token: string): boolean => {
    return (
        typeof token === "string" &&
        (/^(ExponentPushToken|ExpoPushToken)\[.*\]$/.test(token) ||
            /^[a-z0-9-_]{32}$/i.test(token))
    );
};

/**
 * Dispatches push notification messages directly to Expo's Push Service API.
 */
export const sendPushNotifications = async (
    messages: PushMessagePayload[]
): Promise<any> => {
    if (!messages || messages.length === 0) return;

    try {
        const response = await axios.post(EXPO_PUSH_URL, messages, {
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            timeout: 10000,
        });

        const data = response.data?.data;
        if (Array.isArray(data)) {
            // Process any invalid tokens returned by Expo
            for (let i = 0; i < data.length; i++) {
                const ticket = data[i];
                if (ticket.status === "error") {
                    const failedToken = messages[i]?.to;
                    const isUnregistered = ticket.details?.error === "DeviceNotRegistered";
                    if (isUnregistered && typeof failedToken === "string") {
                        await PushToken.updateMany(
                            { token: failedToken },
                            { enabled: false }
                        );
                        console.log("[Push Notification] Device not registered on Expo; token deactivated.");
                    } else {
                        console.warn(`[Push Notification] Expo ticket error for ticket ${i}: ${ticket.message || "Unknown error"}`);
                    }
                }
            }
        }

        return response.data;
    } catch (error: any) {
        console.error("Error sending push notifications via Expo:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Maps order status to user-friendly titles and bodies with clean emojis.
 */
const getOrderNotificationContent = (
    orderNumber: string,
    status: string
): { title: string; body: string } => {
    switch (status.toLowerCase()) {
        case "placed":
            return {
                title: "Order Placed 🛍️",
                body: `Your order #${orderNumber} has been received and is being prepared.`,
            };
        case "confirmed":
            return {
                title: "Order Confirmed 📦",
                body: `Great news! Your order #${orderNumber} has been confirmed.`,
            };
        case "processing":
            return {
                title: "Order Processing ⚙️",
                body: `Your order #${orderNumber} is currently being processed.`,
            };
        case "packed":
            return {
                title: "Order Packed 📦",
                body: `Your order #${orderNumber} is packed and ready for dispatch.`,
            };
        case "shipped":
            return {
                title: "Order Shipped 🚚",
                body: `Your order #${orderNumber} is on its way to you!`,
            };
        case "delivered":
            return {
                title: "Order Delivered 🎉",
                body: `Your order #${orderNumber} has been delivered. Enjoy your purchase!`,
            };
        case "cancelled":
            return {
                title: "Order Cancelled ❌",
                body: `Your order #${orderNumber} has been cancelled.`,
            };
        default:
            return {
                title: "Order Update 🔔",
                body: `Your order #${orderNumber} status is now "${status}".`,
            };
    }
};

/**
 * Sends targeted push notifications to all active devices of a customer when order status updates.
 */
export const sendOrderPushNotification = async ({
    userId,
    orderId,
    orderNumber,
    status,
}: {
    userId: string;
    orderId: string;
    orderNumber: string;
    status: string;
}) => {
    if (!userId) return;

    try {
        // Resolve all possible user identifier aliases (Clerk ID and Mongo ID)
        const userIdsToQuery = [String(userId)];
        try {
            const userDoc = await User.findOne({
                $or: [
                    ...(userId.length === 24 ? [{ _id: userId }] : []),
                    { clerkId: String(userId) },
                ],
            });
            if (userDoc) {
                if (userDoc._id) userIdsToQuery.push(userDoc._id.toString());
                if (userDoc.clerkId) userIdsToQuery.push(userDoc.clerkId);
            }
        } catch (_) {}

        // 1. Check user notification preference (Step 9)
        const preference = await NotificationPreference.findOne({
            userId: { $in: userIdsToQuery },
        });
        if (preference && preference.orderUpdates === false) {
            console.log(`User ${userId} opted out of order push notifications.`);
            return;
        }

        // 2. Query all active push tokens for this user
        const tokens = await PushToken.find({
            userId: { $in: userIdsToQuery },
            enabled: true,
        });

        if (!tokens || tokens.length === 0) {
            console.log(`No active push tokens found for user query: ${userIdsToQuery.join(", ")}`);
            return;
        }

        const { title, body } = getOrderNotificationContent(orderNumber, status);

        const messages: PushMessagePayload[] = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            channelId: "renewx-orders",
            priority: "high",
            title,
            body,
            data: {
                type: "ORDER_UPDATE",
                orderId: String(orderId),
                orderNumber,
                status,
            },
        }));

        await sendPushNotifications(messages);
        console.log(`[Push Notification] Sent order (${status}) to ${messages.length} device(s) for user ${userId}`);
    } catch (error: any) {
        console.error(`[Push Notification] Failed to send order notification for #${orderNumber}:`, error.message);
    }
};

/**
 * Sends a notification to all Admin devices when a new order is received.
 */
export const sendAdminNewOrderNotification = async ({
    orderId,
    orderNumber,
    totalAmount,
    customerName,
}: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    customerName?: string;
}) => {
    try {
        // Find admin users
        const adminUsers = await User.find({
            $or: [
                { role: "admin" },
                ...(process.env.ADMIN_EMAIL ? [{ email: process.env.ADMIN_EMAIL }] : []),
            ],
        }).lean();

        const adminIds: string[] = [];
        for (const admin of adminUsers) {
            if (admin._id) adminIds.push(admin._id.toString());
            if (admin.clerkId) adminIds.push(admin.clerkId);
        }

        if (adminIds.length === 0) {
            console.log("[Push Notification] No admin users found to notify for new order.");
            return;
        }

        const tokens = await PushToken.find({
            userId: { $in: adminIds },
            enabled: true,
        });

        if (!tokens || tokens.length === 0) {
            console.log("[Push Notification] No active admin push tokens found.");
            return;
        }

        const messages: PushMessagePayload[] = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            channelId: "renewx-orders",
            priority: "high",
            title: "New Order Received! 🔔",
            body: `Order #${orderNumber} placed for ₹${totalAmount}${customerName ? ` by ${customerName}` : ""}.`,
            data: {
                type: "ADMIN_NEW_ORDER",
                orderId: String(orderId),
                orderNumber,
            },
        }));

        await sendPushNotifications(messages);
        console.log(`[Push Notification] Sent new-order alert to ${messages.length} admin device(s)`);
    } catch (error: any) {
        console.error("[Push Notification] Failed to notify admins of new order:", error.message);
    }
};
