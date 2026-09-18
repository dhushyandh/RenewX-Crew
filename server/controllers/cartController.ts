import { Request, Response } from "express";
import Cart from "../models/cart.js";
import Product from "../models/Products.js";

const MAX_CART_QUANTITY = 100;
const isValidQuantity = (quantity: unknown): quantity is number =>
    typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_CART_QUANTITY;

export const getCart = async (req: Request, res: Response) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate("items.product", "name images price stock isActive");
        if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });
        return res.status(200).json({ success: true, data: cart });
    } catch (error) {
        console.error("Error fetching cart:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch cart" });
    }
};

export const addToCart = async (req: Request, res: Response) => {
    try {
        const { productId, quantity = 1, size } = req.body;
        if (!productId || !isValidQuantity(quantity) || typeof size !== "string" || !size.trim()) {
            return res.status(400).json({ success: false, message: "A valid product, quantity, and size are required" });
        }

        const product = await Product.findOne({ _id: productId, isActive: true });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        if (!product.sizes.includes(size)) return res.status(400).json({ success: false, message: "Invalid size" });

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });

        const existingItem = cart.items.find(
            item => item.product.toString() === productId && item.size === size
        );
        const resultingQuantity = (existingItem?.quantity ?? 0) + quantity;

        if (resultingQuantity > MAX_CART_QUANTITY) {
            return res.status(400).json({ success: false, message: "Maximum quantity per item is 100" });
        }
        if (product.stock < resultingQuantity) {
            return res.status(400).json({ success: false, message: "Insufficient stock" });
        }

        if (existingItem) {
            existingItem.quantity = resultingQuantity;
            existingItem.price = product.price;
        } else {
            cart.items.push({ product: product._id, price: product.price, quantity, size });
        }

        cart.calculateTotal();
        await cart.save();
        return res.status(200).json({ success: true, message: "Item added to cart successfully", data: cart });
    } catch (error) {
        console.error("Error adding item to cart:", error);
        return res.status(500).json({ success: false, message: "Failed to add item to cart" });
    }
};

export const updateCartItem = async (req: Request, res: Response) => {
    try {
        const { itemId } = req.params;
        const { quantity, size } = req.body;

        if (!itemId || typeof size !== "string" || !size.trim()) {
            return res.status(400).json({ success: false, message: "Product and size are required" });
        }
        if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0 || quantity > MAX_CART_QUANTITY) {
            return res.status(400).json({ success: false, message: "Quantity must be an integer between 0 and 100" });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

        const item = cart.items.find(
            cartItem => cartItem.product.toString() === itemId && cartItem.size === size
        );
        if (!item) return res.status(404).json({ success: false, message: "Item not found in cart" });

        if (quantity === 0) {
            cart.items = cart.items.filter(
                cartItem => !(cartItem.product.toString() === itemId && cartItem.size === size)
            );
        } else {
            const product = await Product.findOne({ _id: item.product, isActive: true });
            if (!product) return res.status(404).json({ success: false, message: "Product not found" });
            if (!product.sizes.includes(size)) return res.status(400).json({ success: false, message: "Invalid size" });
            if (product.stock < quantity) return res.status(400).json({ success: false, message: "Insufficient stock" });
            item.quantity = quantity;
            item.price = product.price;
        }

        cart.calculateTotal();
        await cart.save();
        return res.status(200).json({ success: true, message: "Item updated successfully", data: cart });
    } catch (error) {
        console.error("Error updating cart item:", error);
        return res.status(500).json({ success: false, message: "Failed to update cart item" });
    }
};

export const removeCartItem = async (req: Request, res: Response) => {
    try {
        const { itemId } = req.params;
        const size = typeof req.query.size === "string" ? req.query.size : undefined;
        if (!itemId || !size) return res.status(400).json({ success: false, message: "Product and size are required" });

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

        const originalLength = cart.items.length;
        cart.items = cart.items.filter(
            item => !(item.product.toString() === itemId && item.size === size)
        );
        if (cart.items.length === originalLength) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        cart.calculateTotal();
        await cart.save();
        return res.status(200).json({ success: true, message: "Item removed successfully", data: cart });
    } catch (error) {
        console.error("Error removing cart item:", error);
        return res.status(500).json({ success: false, message: "Failed to remove cart item" });
    }
};

export const clearCart = async (req: Request, res: Response) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (cart) {
            cart.items = [];
            cart.totalAmount = 0;
            await cart.save();
        }
        return res.status(200).json({ success: true, message: "Cart cleared successfully" });
    } catch (error) {
        console.error("Error clearing cart:", error);
        return res.status(500).json({ success: false, message: "Failed to clear cart" });
    }
};
