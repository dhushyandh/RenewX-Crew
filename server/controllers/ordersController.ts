import { Request, Response } from "express"
import Order from "../models/order.js"
import Cart from "../models/cart.js"
import Product from "../models/Products.js"

// Get user Orders -> Get /api/orders

export const getOrders = async (req: Request, res: Response) => {
    try {
        const query = { user: req.user.id }

        const orders = await Order.find(query).sort('-createdAt').populate('items.product', 'name images price stock')

        return res.status(200).json({
            success: true,
            orders
        })

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Get single order -> GET /api/orders/:id

export const getOrder = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.product', 'name images price stock')

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            })
        }

        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: "Not authorized"
            })
        }

        return res.status(200).json({
            success: true,
            order
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Create order from cart -> POST /api/orders

export const createOrder = async (req: Request, res: Response) => {
    try {
        const { items, shippingAddress, paymentMethod, notes } = req.body
        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name images price stock')

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            })
        }

        if (cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            })
        }

        // Verify stck and prepare order items
        const orderItems = [];
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id)
            if (!product || product.stock < item.quantity) {
                return res.status(404).json({
                    success: false,
                    message: `Out of stock: ${product?.name || (item.product as any)?.name || 'Item'}`
                })
            }
            orderItems.push({
                product: item.product._id,
                name: (item.product as any).name,
                quantity: item.quantity,
                price: item.price,
                size: item.size
            })
            // reduce stock quantity
            product.stock -= item.quantity
            await product.save()
        }

        // calculate totals
        const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

        // get shipping cost and tax
        const shippingCost = 2
        const tax = 0;
        const totalAmount = subtotal + shippingCost + tax

        // create order
        const order = await Order.create({
            user: req.user.id,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            paymentStatus: 'pending',
            orderStatus: 'placed',
            totalAmount,
            subtotal,
            tax,
            shippingCost,
            notes,
            paymentIntentId: req.body.paymentIntentId,
            orderNumber: 'ORD-' + Date.now(),
        })

        if (req.body.paymentMethod !== 'stripe') {
            cart.items = [],
                cart.totalAmount = 0;
            await cart.save();
        }

        // clear cart
        await Cart.deleteOne({ user: req.user.id })

        return res.status(201).json({
            success: true,
            order
        })

    }
    catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Update order status -> PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderStatus, paymentStatus } = req.body;
        const order = await Order.findById(req.params.id)
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            })
        }
        if (orderStatus) {
            order.orderStatus = orderStatus;
            if (orderStatus === 'delivered') {
                order.deliveredAt = new Date();
            }
        }
        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
            if (paymentStatus === 'completed') {
                order.deliveredAt = new Date();
            }
        }
        await order.save();
        return res.status(200).json({
            success: true,
            order
        })
    }
    catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Get all orders -> GET /api/orders/all
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, status } = req.query
        const query: any = {}
        if (status) {
            query.orderStatus = status
        }
        const orders = await Order.find(query)
            .sort('-createdAt')
            .populate('user', 'name email')
            .populate('items.product', 'name images price')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))

        const totalOrders = await Order.countDocuments(query)
        const pages = Math.ceil(totalOrders / Number(limit))
        return res.status(200).json({
            success: true,
            orders,
            totalOrders,
            pagination: {
                total: totalOrders, page: Number(page), pages: Math.ceil(totalOrders / Number(limit)),
                limit: Number(limit)
            }
        })
    }
    catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Delete Order -> DELETE /api/orders/:id
export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.id)
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            })
        }
        await order.deleteOne()
        return res.status(200).json({
            success: true,
            message: "Order deleted successfully"
        })
    }
    catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}