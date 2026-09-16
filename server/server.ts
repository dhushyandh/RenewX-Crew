import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express'
import { clerkWebhook } from "./controllers/webhooks.js";
import makeAdmin from "./scripts/makeAdmin.js";
import productRoutes from "./routes/productsRoutes.js";
import CartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import AddressRoutes from "./routes/addressRoutes.js";
import AdminRoutes from "./routes/adminRoutes.js";

const app = express();
await connectDB()

app.post('/api/clerk', express.raw({ type: 'application/json' }), clerkWebhook)


// Middleware
app.use(cors())
app.use(express.json());
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

// Admin Route
app.use('/api/admin', AdminRoutes)

await makeAdmin();

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});