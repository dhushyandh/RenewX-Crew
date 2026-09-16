import { Request, Response } from "express";
import Cart from "../models/cart.js";
import Product from "../models/Products.js";


// Get user cart -> GET /api/cart

export const getCart = async (req: Request, res: Response) => {

    try {
        let cart = await Cart.findOne({ user: req.user.id })
            .populate("items.product", 'name images price stock')

        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] })
        }
        return res.status(200).json({
            success: true,
            data: cart
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Add item to cart -> POST /api/cart/add

export const addToCart = async (req: Request, res: Response) => {
    try {
        const { productId, quantity = 1, size } = req.body;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            })
        }
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock"
            })
        }
        if (!product.sizes.includes(size)) {
            return res.status(400).json({
                success: false,
                message: "Invalid size"
            })
        }

        let cart = await Cart.findOne({ user: req.user.id })

        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] })
        }
        // Find item with same product and size 
        const existingItem = cart.items.find((item) => {
            return item.product.toString() === productId && item.size === size
        })
        if (existingItem) {
            existingItem.quantity += quantity
            existingItem.price = product.price
        }
        else {
            cart.items.push({ product: productId, price: product.price, quantity, size })
        }
        cart.calculateTotal();
        await cart.save()

        await cart.populate("items.product", 'name images price stock')
        return res.status(200).json({
            success: true,
            message: "Item added to cart successfully"
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Update cart item quantity -> PUT /api/cart/update/:itemId

export const updateCartItem = async (req: Request, res: Response) => {
    try {
        const { itemId } = req.params;
        const { quantity, size } = req.body;

        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            })
        }
        const item = cart.items.find((item) => item.product.toString() === itemId && item.size === size);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart"
            })
        }
        if (quantity <= 0) {
            cart.items = cart.items.filter((item) => item.product.toString() !== itemId || item.size !== size);
        } else {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                })
            }
            if (product.stock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient stock"
                })
            }
            item.quantity = quantity;
        }
        cart.calculateTotal();
        await cart.save();
        await cart.populate("items.product", 'name images price stock')
        return res.status(200).json({
            success: true,
            message: "Item updated successfully"
        })

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Remove item from cart -> DELETE /api/cart/remove/:itemId

export const removeCartItem = async (req: Request, res: Response) => {
    try {
        const { size } = req.query;
        const cart = await Cart.findOne({ user: req.user._id })

        if (!cart || !size) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            })
        }

        const item = cart.items.filter((item) => item.product.toString() !== req.params.id && item.size !== size);
        cart.calculateTotal();
        await cart.save();
        await cart.populate("items.product", 'name images price stock')

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            })
        }

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Clear cart -> DELETE /api/cart

export const clearCart = async (req: Request, res: Response) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
        if (cart) {
            cart.items = [];
            cart.totalAmount = 0;
            await cart.save();
        }
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}


