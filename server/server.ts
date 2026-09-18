import "dotenv/config";
import express, { Request, Response, NextFunction } from 'express';
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import connectDB from "./config/db.js";
import { clerkMiddleware, getAuth } from '@clerk/express'
import mongoose from "mongoose"
import { clerkWebhook } from "./controllers/webhooks.js";
import productRoutes from "./routes/productsRoutes.js";
import CartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import AddressRoutes from "./routes/addressRoutes.js";
import AdminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { razorpayWebhook } from "./controllers/paymentWebhook.js";

const app = express();

// Fail fast during startup if the database is unavailable. This prevents the
// API from accepting requests while MongoDB is disconnected.
await connectDB();

// Render/reverse proxies must be trusted so rate limiting sees the real
// client address instead of treating every request as one proxy IP.
app.set("trust proxy", 1);

// Webhooks must receive the untouched request body for signature verification.
app.post('/api/clerk', express.raw({ type: 'application/json' }), clerkWebhook);
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// Security middleware
app.disable("x-powered-by");
app.use(helmet());

const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = isProduction
    ? configuredOrigins
    : [
        ...configuredOrigins,
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Native mobile apps normally do not send an Origin header.
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Expo Web can use different local ports depending on the CLI/version.
        // Allow localhost/127.0.0.1 on any port only in development.
        if (!isProduction) {
            try {
                const requestOrigin = new URL(origin);
                const isLocalhost =
                    requestOrigin.protocol === "http:" &&
                    (requestOrigin.hostname === "localhost" ||
                        requestOrigin.hostname === "127.0.0.1");

                if (isLocalhost) {
                    return callback(null, true);
                }
            } catch {
                // Fall through to the CORS rejection below.
            }
        }

        return callback(new Error("CORS origin not allowed"));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
}));

// Limit JSON payloads to reduce accidental/malicious memory usage.
app.use(express.json({ limit: "1mb" }));

// Clerk is initialized before rate limiting so authenticated requests can be
// bucketed per Clerk user. This avoids one shared NAT/proxy IP exhausting the
// limit for every user of the application.
app.use(clerkMiddleware());

const rateLimitKey = (req: Request) => {
    const userId = getAuth(req)?.userId;

    if (userId) {
        return `user:${userId}`;
    }

    return `ip:${ipKeyGenerator(req.ip || "unknown")}`;
};

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    skip: (req) => req.path === "/health",
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});

app.use("/api", apiLimiter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && "status" in err && (err as any).status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Malformed JSON payload in request body",
        });
    }
    next(err);
});

app.get("/health", (req: Request, res: Response) => {
    const dbReady = mongoose.connection.readyState === 1;
    return res.status(dbReady ? 200 : 503).json({
        success: dbReady,
        status: dbReady ? "ok" : "degraded",
        database: dbReady ? "connected" : "disconnected",
    });
});

// Fail fast when MongoDB is unavailable. Without this guard, Mongoose can
// buffer database queries and make clients wait until their HTTP timeout.
const requireDatabase = (req: Request, res: Response, next: NextFunction) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: "Database temporarily unavailable. Please try again shortly.",
        });
    }
    next();
};
const port = Number(process.env.PORT || 3000);

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use('/api/products', requireDatabase, productRoutes);
app.use('/api/cart', requireDatabase, CartRoutes);
app.use('/api/orders', requireDatabase, orderRoutes);
app.use('/api/addresses', requireDatabase, AddressRoutes);
app.use('/api/notifications', requireDatabase, notificationRoutes);
app.use('/api/payments', requireDatabase, paymentRoutes);
app.use('/api/admin', requireDatabase, AdminRoutes);



// Keep API errors JSON and avoid exposing internal stack traces to clients.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE"
            ? "Image file is too large. Maximum size is 5 MB per image."
            : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
                ? "Too many image files were uploaded. Maximum is 5 images."
                : "Invalid multipart upload request";
        return res.status(400).json({ success: false, message });
    }

    if (err?.message === "Only JPEG, PNG, and WebP images are allowed.") {
        return res.status(400).json({ success: false, message: err.message });
    }

    console.error("Unhandled API error:", err);
    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
