import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productsRoutes.js";
import CartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import AddressRoutes from "./routes/addressRoutes.js";
import AdminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import sellRequestRoutes from "./routes/sellRequestRoutes.js";
import { razorpayWebhook } from "./controllers/paymentWebhook.js";

const app = express();
await connectDB();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());

const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",").map(origin => origin.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (configuredOrigins.includes(origin)) return callback(null, true);
        if (!isProduction) {
            try {
                const parsed = new URL(origin);
                if (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname)) return callback(null, true);
            } catch { /* reject malformed origins */ }
        }
        return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
}));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        const authorization = req.headers.authorization;
        const tokenHint = authorization?.startsWith("Bearer ") ? authorization.slice(7, 31) : undefined;
        return tokenHint ? `token:${tokenHint}` : `ip:${ipKeyGenerator(req.ip || "unknown")}`;
    },
    skip: req => req.path === "/health",
    message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api", apiLimiter);

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
        return res.status(400).json({ success: false, message: "Malformed JSON payload in request body" });
    }
    return next(err);
});

app.get("/health", (_req: Request, res: Response) => res.status(200).json({ success: true, status: "ok" }));
app.get("/", (_req: Request, res: Response) => res.send("Server is Live!"));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", CartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", AddressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/sell-requests", sellRequestRoutes);
app.use("/api/admin", AdminRoutes);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));
