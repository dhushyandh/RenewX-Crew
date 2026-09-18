import express, { Request, Response, NextFunction } from "express";
import { protect } from "../middlewares/auth.js";
import { getAuth } from "@clerk/express";
import User from "../models/user.js";
import {
    registerPushToken,
    unregisterPushToken,
    getPreferences,
    updatePreferences,
    sendTestNotification,
} from "../controllers/notificationController.js";

const notificationRoutes = express.Router();

// Optional auth middleware for production test endpoint
const optionalProtect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const auth = getAuth(req);
        const userId = auth?.userId || (req as any).auth?.userId;
        if (userId) {
            const user = await User.findOne({ clerkId: userId });
            if (user) (req as any).user = user;
        }
    } catch (_) {}
    next();
};

// Endpoints
notificationRoutes.post("/register", protect, registerPushToken);
notificationRoutes.delete("/unregister", protect, unregisterPushToken);
notificationRoutes.get("/preferences", protect, getPreferences);
notificationRoutes.put("/preferences", protect, updatePreferences);
notificationRoutes.post("/test", optionalProtect, sendTestNotification);

export default notificationRoutes;
