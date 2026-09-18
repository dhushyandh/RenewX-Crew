import mongoose from "mongoose";
import { Request, Response } from "express";
import Order from "../models/order.js";
import Cart from "../models/cart.js";
import Product from "../models/Products.js";
import { sendOrderPushNotification, sendAdminNewOrderNotification } from "../services/pushNotification.js";
import {
    fetchRazorpayOrder,
    fetchRazorpayPayment,
    verifyRazorpayPaymentSignature,
} from "../services/razorpay.js";

// Get user Orders -> GET /api/orders
export const getOrders = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const query = { user: userId };

        const orders = await Order.find(query)
            .sort("-createdAt")
            .populate("items.product", "name images price stock category");

        return res.status(200).json({
            success: true,
            orders: orders || []
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single order -> GET /api/orders/:id
export const getOrder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const userRole = (req as any).user?.role;

        const order = await Order.findById(req.params.id)
            .populate("items.product", "name images price stock category")
            .populate("user", "name email");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.user.toString() !== userId.toString() && userRole !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Forbidden"
            });
        }

        return res.status(200).json({
            success: true,
            order
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// export const createOrder = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();

    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const {
            items: directItems,
            shippingAddress,
            paymentMethod,
            notes,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        } = req.body;

        if (!shippingAddress?.street || !shippingAddress?.city ||
            !shippingAddress?.state || !shippingAddress?.zipCode ||
            !shippingAddress?.country) {
            return res.status(400).json({
                success: false,
                message: "Complete shipping address is required",
            });
        }

        if (paymentMethod !== "cash" && paymentMethod !== "razorpay") {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method",
            });
        }

        if (paymentMethod === "razorpay" &&
            (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature)) {
            return res.status(400).json({
                success: false,
                message: "Online payment verification data is required",
            });
        }

        const sourceItems: any[] =
            Array.isArray(directItems) && directItems.length > 0
                ? directItems
                : ((await Cart.findOne({ user: userId }).lean())?.items || []);

        if (sourceItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty",
            });
        }

        const orderItems: any[] = [];
        let subtotal = 0;

        // Read authoritative product data from MongoDB.
        for (const item of sourceItems) {
            const productId =
                item.productId || item.product?._id || item.product;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product in order",
                });
            }

            const quantity = Number(item.quantity);
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid item quantity",
                });
            }

            const product = await Product.findOne({
                _id: productId,
                isActive: true,
            }).lean();

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "One or more products are unavailable",
                });
            }

            if (product.stock < quantity) {
                return res.status(409).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`,
                });
            }

            const size = item.size;
            if (product.sizes?.length > 0) {
                if (!size || !product.sizes.includes(size)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid size for ${product.name}`,
                    });
                }
            }

            const price = Number(product.price);

            orderItems.push({
                product: product._id,
                name: product.name,
                quantity,
                price,
                ...(size ? { size } : {}),
            });

            subtotal += price * quantity;
        }

        // Never accept shipping, tax, subtotal, or total from the client.
        const shippingCost = subtotal >= 1000 ? 0 : 80;
        const tax = 0;
        const totalAmount = subtotal + shippingCost + tax;

        if (paymentMethod === "razorpay") {
            const existingOrder = await Order.findOne({ razorpayOrderId });
            if (existingOrder) {
                return res.status(200).json({
                    success: true,
                    message: "Order already created",
                    order: existingOrder,
                });
            }

            try {
                const razorpayOrder = await fetchRazorpayOrder(razorpayOrderId);
                if (Number(razorpayOrder?.amount) !== Math.round(totalAmount * 100) ||
                    razorpayOrder?.currency !== "INR") {
                    return res.status(400).json({
                        success: false,
                        message: "Payment amount verification failed",
                    });
                }

                const validSignature = verifyRazorpayPaymentSignature(
                    razorpayOrderId,
                    razorpayPaymentId,
                    razorpaySignature
                );

                if (!validSignature) {
                    return res.status(400).json({
                        success: false,
                        message: "Payment verification failed",
                    });
                }

                const payment = await fetchRazorpayPayment(razorpayPaymentId);

                if (payment?.order_id !== razorpayOrderId ||
                    Number(payment?.amount) !== Math.round(totalAmount * 100) ||
                    payment?.currency !== "INR" ||
                    payment?.status !== "captured") {
                    return res.status(400).json({
                        success: false,
                        message: "Payment has not been captured",
                    });
                }
            } catch (paymentError) {
                console.error("Razorpay verification error:", paymentError);
                return res.status(502).json({
                    success: false,
                    message: "Unable to verify online payment",
                });
            }
        }

        let order: any;

        await session.withTransaction(async () => {
            // Atomic stock reservation/decrement for every item.
            // The transaction guarantees that a failure rolls back all
            // decrements rather than leaving partially reduced stock.
            for (const item of orderItems) {
                const updated = await Product.findOneAndUpdate(
                    {
                        _id: item.product,
                        isActive: true,
                        stock: { $gte: item.quantity },
                    },
                    { $inc: { stock: -item.quantity } },
                    { new: true, session }
                );

                if (!updated) {
                    throw new Error(
                        `INSUFFICIENT_STOCK:${item.name}`
                    );
                }
            }

            const orderNumber =
                `ORD-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)
                    .toUpperCase()}`;

            const created = await Order.create(
                [{
                    user: userId,
                    items: orderItems,
                    shippingAddress,
                    paymentMethod,
                    paymentStatus: paymentMethod === "razorpay" ? "completed" : "pending",
                    orderStatus: "placed",
                    totalAmount,
                    subtotal,
                    tax,
                    shippingCost,
                    notes,
                    razorpayOrderId:
                        paymentMethod === "razorpay"
                            ? razorpayOrderId
                            : undefined,
                    razorpayPaymentId:
                        paymentMethod === "razorpay"
                            ? razorpayPaymentId
                            : undefined,
                    orderNumber,
                }],
                { session }
            );

            order = created[0];

            // Clear the cart in the same transaction as the order and stock
            // update, preventing an order from being created while the cart
            // remains populated after a successful transaction.
            await Cart.updateOne(
                { user: userId },
                { $set: { items: [], totalAmount: 0 } },
                { session }
            );
        });

        sendOrderPushNotification({
            userId: (req as any).user?.clerkId || String(userId),
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            status: "placed",
        }).catch((err) =>
            console.warn("Order placement push error:", err)
        );

        sendAdminNewOrderNotification({
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            totalAmount,
            customerName: (req as any).user?.name || "Customer",
        }).catch((err) =>
            console.warn("Admin order alert push error:", err)
        );

        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order,
        });
    } catch (error: any) {
        if (error?.message?.startsWith("INSUFFICIENT_STOCK:")) {
            return res.status(409).json({
                success: false,
                message: `Insufficient stock for ${error.message.replace(
                    "INSUFFICIENT_STOCK:",
                    ""
                )}. Please refresh your cart and try again.`,
            });
        }

        console.error("Create order error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create order",
        });
    } finally {
        await session.endSession();
    }
};

te order",
        });
    }
};

// Update order status -> PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderStatus, status, paymentStatus } = req.body;
        const targetStatus = orderStatus || status;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (targetStatus) {
            order.orderStatus = targetStatus;
            if (targetStatus === "delivered") {
                order.deliveredAt = new Date();
            }
        }

        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }

        await order.save();

        // Dispatch push notification to customer if status was updated
        if (targetStatus && order.user) {
            sendOrderPushNotification({
                userId: order.user.toString(),
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                status: targetStatus,
            }).catch((err) => console.warn("Order status update push error:", err));
        }

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            order
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all orders -> GET /api/orders/admin/all
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50, status } = req.query;
        const query: any = {};
        if (status) {
            query.orderStatus = status;
        }

        const orders = await Order.find(query)
            .sort("-createdAt")
            .populate("user", "name email")
            .populate("items.product", "name images price")
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const totalOrders = await Order.countDocuments(query);

        return res.status(200).json({
            success: true,
            orders,
            totalOrders,
            pagination: {
                total: totalOrders,
                page: Number(page),
                pages: Math.ceil(totalOrders / Number(limit)),
                limit: Number(limit)
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update full order -> PUT /api/orders/:id
export const updateOrder = async (req: Request, res: Response) => {
    try {
        const { orderStatus, status, paymentStatus, notes, shippingAddress } = req.body;
        const updates: any = {};
        const targetStatus = orderStatus || status;
        if (targetStatus) {
            updates.orderStatus = targetStatus;
            if (targetStatus === "delivered") {
                updates.deliveredAt = new Date();
            }
        }
        if (paymentStatus) updates.paymentStatus = paymentStatus;
        if (notes !== undefined) updates.notes = notes;
        if (shippingAddress) updates.shippingAddress = shippingAddress;

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        ).populate("user", "name email").populate("items.product", "name images price");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Dispatch push notification to customer if status was updated
        if (targetStatus && order.user) {
            const customerUserId = typeof order.user === "object" && (order.user as any)._id
                ? (order.user as any)._id.toString()
                : order.user.toString();
            sendOrderPushNotification({
                userId: customerUserId,
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                status: targetStatus,
            }).catch((err) => console.warn("Order update push error:", err));
        }

        return res.status(200).json({
            success: true,
            message: "Order updated successfully",
            order
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update order"
        });
    }
};

// Delete Order -> DELETE /api/orders/:id
export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        await order.deleteOne();
        return res.status(200).json({
            success: true,
            message: "Order deleted successfully"
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
