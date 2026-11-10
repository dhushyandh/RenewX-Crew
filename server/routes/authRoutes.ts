import express from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me, refresh, register } from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Too many authentication attempts. Try again later." } });
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", protect, logout);
router.get("/me", protect, me);
export default router;
