import "dotenv/config";
import express, { Request, Response, NextFunction } from 'express';
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import connectDB from "./config/db.js";
import { clerkMiddleware, getAuth } from '@clerk/express'
import { clerkWebhook } from "./controllers/webhooks.js";
import makeAdmin from "./scripts/makeAdmin.js";
import productRoutes from "./routes/productsRoutes.js";
import CartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import AddressRoutes from "./routes/addressRoutes.js";
import AdminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { razorpayWebhook } from "./controllers/paymentWebhook.js";

const app = express();
await connectDB();

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
    return res.status(200).json({ success: true, status: "ok" });
});

const port = Number(process.env.PORT || 3000);

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use('/api/products', productRoutes);
app.use('/api/cart', CartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', AddressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', AdminRoutes);

await makeAdmin();

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
