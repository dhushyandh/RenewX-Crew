import { Request, Response } from "express";
import PushToken from "../models/PushToken.js";
import NotificationPreference from "../models/NotificationPreference.js";
import { isExpoPushToken, sendPushNotifications } from "../services/pushNotification.js";

/**
 * Register or update an Expo Push Token for the authenticated user.
 * POST /api/notifications/register
 */
export const registerPushToken = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?.clerkId || user?.id || user?._id?.toString();

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        const { token, platform = "android" } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Push token is required",
            });
        }

        if (!isExpoPushToken(token)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Expo push token format",
            });
        }

        // Upsert the token: if token exists, associate it with this user and enable it
        const pushTokenDoc = await PushToken.findOneAndUpdate(
            { token },
            {
                userId: String(userId),
                platform: ["android", "ios", "web"].includes(platform) ? platform : "android",
                enabled: true,
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Push token registered successfully",
            data: {
                id: pushTokenDoc._id,
                platform: pushTokenDoc.platform,
                enabled: pushTokenDoc.enabled,
            },
        });
    } catch (error: any) {
        console.error("Error registering push token:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to register push token",
        });
    }
};

/**
 * Unregister/deactivate a push token when logging out or turning off notifications.
 * DELETE /api/notifications/unregister
 */
export const unregisterPushToken = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?.clerkId || user?.id || user?._id?.toString();
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required to unregister",
            });
        }

        await PushToken.findOneAndUpdate(
            { token, ...(userId ? { userId: String(userId) } : {}) },
            { enabled: false }
        );

        return res.status(200).json({
            success: true,
            message: "Push token unregistered successfully",
        });
    } catch (error: any) {
        console.error("Error unregistering push token:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to unregister push token",
        });
    }
};

/**
 * Get notification preferences for the authenticated user.
 * GET /api/notifications/preferences
 */
export const getPreferences = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?.clerkId || user?.id || user?._id?.toString();

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        let preferences = await NotificationPreference.findOne({ userId: String(userId) });

        if (!preferences) {
            preferences = await NotificationPreference.create({
                userId: String(userId),
                orderUpdates: true,
                offers: true,
                general: true,
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                orderUpdates: preferences.orderUpdates,
                offers: preferences.offers,
                general: preferences.general,
            },
        });
    } catch (error: any) {
        console.error("Error fetching preferences:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch notification preferences",
        });
    }
};

/**
 * Update notification preferences for the authenticated user.
 * PUT /api/notifications/preferences
 */
export const updatePreferences = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?.clerkId || user?.id || user?._id?.toString();

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        const { orderUpdates, offers, general } = req.body;

        const updateData: Record<string, boolean> = {};
        if (typeof orderUpdates === "boolean") updateData.orderUpdates = orderUpdates;
        if (typeof offers === "boolean") updateData.offers = offers;
        if (typeof general === "boolean") updateData.general = general;

        const preferences = await NotificationPreference.findOneAndUpdate(
            { userId: String(userId) },
            { ...updateData, userId: String(userId) },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Notification preferences updated",
            data: {
                orderUpdates: preferences.orderUpdates,
                offers: preferences.offers,
                general: preferences.general,
            },
        });
    } catch (error: any) {
        console.error("Error updating preferences:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update notification preferences",
        });
    }
};

/**
 * Send a test push notification.
 * Works seamlessly in production:
 * 1. Supports direct token in body: { token: "ExponentPushToken[...]" }
 * 2. Supports authenticated user's registered tokens
 * 3. Falls back to latest active token in database for diagnostic verification
 * POST /api/notifications/test
 */
export const sendTestNotification = async (req: Request, res: Response) => {
    try {
        const { token, title, body } = req.body || {};
        const user = (req as any).user;
        const userId = user?.clerkId || user?.id || user?._id?.toString();

        let targetTokens: string[] = [];

        if (token && isExpoPushToken(token)) {
            targetTokens = [token];
        } else if (userId) {
            const userTokens = await PushToken.find({ userId: String(userId), enabled: true });
            targetTokens = userTokens.map((t) => t.token);
        }

        // Production diagnostic fallback: check latest active token in DB if none resolved yet
        if (targetTokens.length === 0) {
            const latestTokenDoc = await PushToken.findOne({ enabled: true }).sort({ updatedAt: -1 });
            if (latestTokenDoc?.token) {
                targetTokens = [latestTokenDoc.token];
            }
        }

        if (targetTokens.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active Expo push tokens found. Pass { token: 'ExponentPushToken[...]' } or register a device first.",
            });
        }

        const messages = targetTokens.map((t) => ({
            to: t,
            sound: "default" as const,
            channelId: "renewx-general",
            priority: "high" as const,
            title: title || "RenewX Push Notification Test 🚀",
            body: body || "Your device is successfully connected to the RenewX Push Notification Service!",
            data: { type: "TEST_NOTIFICATION", timestamp: Date.now() },
        }));

        const result = await sendPushNotifications(messages);
        const tickets = result?.data || [];
        const allFailed = tickets.length > 0 && tickets.every((t: any) => t.status === "error");

        if (allFailed) {
            const errDetail = tickets[0];
            return res.status(400).json({
                success: false,
                message: errDetail.details?.error === "DeviceNotRegistered"
                    ? "Target device is not registered on Expo. Please register an active physical device first."
                    : (errDetail.message || "Expo could not deliver push notification."),
                details: errDetail,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Test push sent to ${targetTokens.length} device(s)`,
            tokens: targetTokens,
            result,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send test push notification",
        });
    }
};
