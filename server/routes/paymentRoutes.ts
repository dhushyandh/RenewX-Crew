import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middlewares/auth.js";
import { createPaymentOrder } from "../controllers/paymentController.js";

const paymentRoutes = express.Router();

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message: "Too many payment attempts. Please try again later." },
});

paymentRoutes.post("/create-order", protect, paymentLimiter, createPaymentOrder);

export default paymentRoutes;
