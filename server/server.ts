import "dotenv/config";
import express, { Request, Response, NextFunction } from 'express';
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express'
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
await connectDB()

app.post('/api/clerk', express.raw({ type: 'application/json' }), clerkWebhook)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), razorpayWebhook)

// Security middleware
app.disable("x-powered-by");
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Native mobile apps normally do not send an Origin header.
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("CORS origin not allowed"));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
}));

// Limit JSON payloads to reduce accidental/malicious memory usage.
app.use(express.json({ limit: "1mb" }));

// Global API rate limit. Authentication/payment-sensitive endpoints should
// receive stricter limits as those routes are hardened.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});

app.use("/api", apiLimiter);

// Handle malformed JSON body errors cleanly without noisy stack traces
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && "status" in err && (err as any).status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Malformed JSON payload in request body",
        });
    }
    next(err);
});

app.use(clerkMiddleware());

app.get("/health", (req: Request, res: Response) => {
    return res.send("OK");
});
const port = process.env.PORT || 3000;

// Routes
app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});
app.use('/api/products', productRoutes)
app.use('/api/cart', CartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/addresses', AddressRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/payments', paymentRoutes)

// Admin Route
app.use('/api/admin', AdminRoutes)

await makeAdmin();

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
