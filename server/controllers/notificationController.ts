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
 * Send a test push notification to the authenticated admin's registered devices.
 * POST /api/notifications/test
 *
 * This endpoint intentionally does not accept arbitrary push tokens. Admins can
 * only test devices already registered to their own account.
 */
export const sendTestNotification = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?.clerkId || user?.id || user?._id?.toString();

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        const userTokens = await PushToken.find({
            userId: String(userId),
            enabled: true,
        }).select("token platform");

        if (userTokens.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active Expo push tokens found for your account. Register a device first.",
            });
        }

        const { title, body } = req.body || {};

        const messages = userTokens.map((device) => ({
            to: device.token,
            sound: "default" as const,
            channelId: "renewx-general",
            priority: "high" as const,
            title:
                typeof title === "string" && title.trim()
                    ? title.trim().slice(0, 100)
                    : "RenewX Push Notification Test 🚀",
            body:
                typeof body === "string" && body.trim()
                    ? body.trim().slice(0, 500)
                    : "Your device is successfully connected to the RenewX Push Notification Service!",
            data: {
                type: "TEST_NOTIFICATION",
                timestamp: Date.now(),
            },
        }));

        const result = await sendPushNotifications(messages);
        const tickets = result?.data || [];
        const allFailed =
            tickets.length > 0 &&
            tickets.every((ticket: any) => ticket.status === "error");

        if (allFailed) {
            const firstError = tickets[0];

            return res.status(400).json({
                success: false,
                message:
                    firstError.details?.error === "DeviceNotRegistered"
                        ? "A registered device is no longer available. Please register the device again."
                        : firstError.message || "Expo could not deliver the push notification.",
            });
        }

        return res.status(200).json({
            success: true,
            message: `Test push sent to ${messages.length} registered device(s)`,
            result: {
                tickets,
            },
        });
    } catch (error) {
        console.error("Error sending test push notification:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send test push notification",
        });
    }
};
