import express from "express";
import { authorize, protect } from "../middlewares/auth.js";
import {
    registerPushToken,
    unregisterPushToken,
    getPreferences,
    updatePreferences,
    sendTestNotification,
} from "../controllers/notificationController.js";

const notificationRoutes = express.Router();

notificationRoutes.post("/register", protect, registerPushToken);
notificationRoutes.delete("/unregister", protect, unregisterPushToken);
notificationRoutes.get("/preferences", protect, getPreferences);
notificationRoutes.put("/preferences", protect, updatePreferences);
notificationRoutes.post("/test", protect, authorize("admin"), sendTestNotification);

export default notificationRoutes;
