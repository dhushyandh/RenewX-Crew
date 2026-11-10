import { Request, Response } from "express";
import mongoose from "mongoose";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Products.js";

export const getWishlist = async (req: Request, res: Response) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user.id }).populate("products", "name description price images category stock isActive");
        if (!wishlist) wishlist = await Wishlist.create({ user: req.user.id, products: [] });
        return res.status(200).json({ success: true, data: wishlist });
    } catch (error) {
        console.error("Get wishlist error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch wishlist" });
    }
};

export const addWishlistItem = async (req: Request, res: Response) => {
    try {
        const { productId } = req.body || {};
        if (!productId || !mongoose.isValidObjectId(productId)) return res.status(400).json({ success: false, message: "A valid product ID is required" });
        const product = await Product.findOne({ _id: productId, isActive: true }).select("_id");
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        const wishlist = await Wishlist.findOneAndUpdate(
            { user: req.user.id },
            { $addToSet: { products: product._id }, $setOnInsert: { user: req.user.id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).populate("products", "name description price images category stock isActive");
        return res.status(200).json({ success: true, data: wishlist });
    } catch (error) {
        console.error("Add wishlist item error:", error);
        return res.status(500).json({ success: false, message: "Failed to add wishlist item" });
    }
};

export const removeWishlistItem = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ success: false, message: "A valid product ID is required" });
        const wishlist = await Wishlist.findOneAndUpdate(
            { user: req.user.id },
            { $pull: { products: productId } },
            { new: true }
        ).populate("products", "name description price images category stock isActive");
        if (!wishlist) return res.status(404).json({ success: false, message: "Wishlist not found" });
        return res.status(200).json({ success: true, data: wishlist });
    } catch (error) {
        console.error("Remove wishlist item error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove wishlist item" });
    }
};
