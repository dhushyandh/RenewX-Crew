import { Request, Response } from "express";
import Order from "../models/order.js";
import { verifyRazorpayWebhookSignature } from "../services/razorpay.js";

export const razorpayWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.header("x-razorpay-signature");
        if (!signature || !Buffer.isBuffer(req.body)) {
            return res.status(400).json({ success: false, message: "Invalid webhook request" });
        }

        if (!verifyRazorpayWebhookSignature(req.body, signature)) {
            return res.status(401).json({ success: false, message: "Invalid webhook signature" });
        }

        const event = JSON.parse(req.body.toString("utf8"));
        const eventName = event?.event;

        if (eventName === "order.paid") {
            const razorpayOrderId = event?.payload?.order?.entity?.id;
            const razorpayPaymentId = event?.payload?.payment?.entity?.id;
            if (razorpayOrderId) {
                await Order.updateOne(
                    { razorpayOrderId, paymentMethod: "razorpay" },
                    { $set: { paymentStatus: "completed", ...(razorpayPaymentId ? { razorpayPaymentId } : {}) } }
                );
            }
        } else if (eventName === "payment.failed") {
            const razorpayOrderId = event?.payload?.payment?.entity?.order_id;
            if (razorpayOrderId) {
                await Order.updateOne(
                    { razorpayOrderId, paymentMethod: "razorpay", paymentStatus: "pending" },
                    { $set: { paymentStatus: "cancelled" } }
                );
            }
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Razorpay webhook error:", error);
        return res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
};
