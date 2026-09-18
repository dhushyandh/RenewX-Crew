import { Request, Response } from "express";
import Cart from "../models/cart.js";
import Product from "../models/Products.js";
import { createRazorpayOrder, getRazorpayKeyId } from "../services/razorpay.js";

export const createPaymentOrder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

        const directItems = Array.isArray(req.body?.items) ? req.body.items : [];
        const cartItems = directItems.length > 0
            ? directItems
            : ((await Cart.findOne({ user: userId }).lean())?.items || []);

        if (cartItems.length === 0) return res.status(400).json({ success: false, message: "Cart is empty" });

        let subtotal = 0;

        for (const item of cartItems) {
            const productId = item.productId || item.product?._id || item.product;
            const quantity = Number(item.quantity);

            if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
                return res.status(400).json({ success: false, message: "Invalid cart item" });
            }

            const product = await Product.findOne({ _id: productId, isActive: true }).lean();
            if (!product) return res.status(404).json({ success: false, message: "One or more products are unavailable" });
            if (product.stock < quantity) return res.status(409).json({ success: false, message: `Insufficient stock for ${product.name}` });

            if (product.sizes?.length > 0 && (!item.size || !product.sizes.includes(item.size))) {
                return res.status(400).json({ success: false, message: `Invalid size for ${product.name}` });
            }

            subtotal += Number(product.price) * quantity;
        }

        const shippingCost = subtotal >= 1000 ? 0 : 80;
        const totalAmount = subtotal + shippingCost;
        const amountInPaise = Math.round(totalAmount * 100);

        if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
            return res.status(400).json({ success: false, message: "Invalid payment amount" });
        }

        const razorpayOrder = await createRazorpayOrder({
            amount: amountInPaise,
            receipt: `RX-${Date.now()}`,
            notes: { userId: String(userId) },
        });

        return res.status(201).json({
            success: true,
            keyId: getRazorpayKeyId(),
            razorpayOrderId: razorpayOrder.id,
            amount: amountInPaise,
            currency: "INR",
        });
    } catch (error: any) {
        console.error("Create Razorpay order error:", error?.response?.data || error);
        return res.status(502).json({ success: false, message: "Unable to start online payment" });
    }
};
