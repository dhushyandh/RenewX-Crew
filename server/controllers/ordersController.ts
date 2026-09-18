import { Request, Response } from "express";
import Order from "../models/order.js";
import Cart from "../models/cart.js";
import Product from "../models/Products.js";
import { sendOrderPushNotification, sendAdminNewOrderNotification } from "../services/pushNotification.js";

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
            return res.status(401).json({
                success: false,
                message: "Not authorized"
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

// Create order -> POST /api/orders
export const createOrder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { items: directItems, shippingAddress, paymentMethod, notes, pricing } = req.body;

        let orderItems: any[] = [];
        let subtotal = 0;

        // If items are provided directly in the request body (e.g. from checkout flow)
        if (directItems && Array.isArray(directItems) && directItems.length > 0) {
            for (const item of directItems) {
                const prodId = item.productId || item.product?._id || item.product;
                const product = await Product.findById(prodId);

                const itemPrice = Number(item.price || product?.price || 0);
                const itemQty = Number(item.quantity || 1);
                const itemName = item.name || product?.name || "Product Item";
                const itemSize = item.size || "M";

                orderItems.push({
                    product: prodId,
                    name: itemName,
                    quantity: itemQty,
                    price: itemPrice,
                    size: itemSize
                });

                if (product) {
                    if (product.stock >= itemQty) {
                        product.stock -= itemQty;
                        await product.save();
                    }
                }

                subtotal += itemPrice * itemQty;
            }
        } else {
            // Otherwise fallback to user's cart in database
            const cart = await Cart.findOne({ user: userId }).populate("items.product", "name images price stock");
            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Cart is empty"
                });
            }

            for (const item of cart.items) {
                const product = await Product.findById((item.product as any)._id || item.product);
                orderItems.push({
                    product: (item.product as any)._id || item.product,
                    name: (item.product as any).name || "Product",
                    quantity: item.quantity,
                    price: item.price,
                    size: item.size
                });

                if (product && product.stock >= item.quantity) {
                    product.stock -= item.quantity;
                    await product.save();
                }

                subtotal += item.price * item.quantity;
            }
        }

        const shippingCost = pricing?.shipping !== undefined ? Number(pricing.shipping) : (subtotal >= 1000 ? 0 : 80);
        const tax = pricing?.tax !== undefined ? Number(pricing.tax) : 0;
        const totalAmount = pricing?.total !== undefined ? Number(pricing.total) : (subtotal + shippingCost + tax);

        const order: any = await Order.create({
            user: userId,
            items: orderItems,
            shippingAddress: shippingAddress || {
                street: "Standard Delivery",
                city: "Local",
                state: "Local",
                zipCode: "000000",
                country: "India"
            },
            paymentMethod: paymentMethod === "stripe" ? "stripe" : "cash",
            paymentStatus: paymentMethod === "card" || paymentMethod === "upi" || paymentMethod === "stripe" ? "paid" : "pending",
            orderStatus: "placed",
            totalAmount,
            subtotal,
            tax,
            shippingCost,
            notes,
            paymentIntentId: req.body.paymentIntentId,
            orderNumber: "ORD-" + Date.now(),
        });

        // Clear cart after order is successfully placed
        await Cart.findOneAndUpdate({ user: userId }, { items: [], totalAmount: 0 });

        // Dispatch push notification to customer devices
        sendOrderPushNotification({
            userId: (req as any).user?.clerkId || (req as any).user?.id || (req as any).user?._id?.toString() || String(userId),
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            status: "placed",
        }).catch((err) => console.warn("Order placement push error:", err));

        // Dispatch new order alert to Admin devices
        sendAdminNewOrderNotification({
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            totalAmount,
            customerName: (req as any).user?.name || "Customer",
        }).catch((err) => console.warn("Admin order alert push error:", err));

        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order
        });
    } catch (error: any) {
        console.error("Create order error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create order"
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
