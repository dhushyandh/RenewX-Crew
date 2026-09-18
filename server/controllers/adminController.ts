import { Request, Response } from "express";
import User from "../models/user.js";
import Order from "../models/order.js";
import Product from "../models/Products.js";

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const [totalUsers, totalProducts, totalOrder, validOrder, recentOrders, orderSummary] =
            await Promise.all([
                User.countDocuments(),
                Product.countDocuments(),
                Order.countDocuments(),
                Order.find({ orderStatus: { $ne: "cancelled" } }).select("totalAmount").lean(),
                Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email").lean(),
                Order.aggregate([
                    { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
                ]),
            ]);

        const totalRevenue = validOrder.reduce((sum, order) => sum + order.totalAmount, 0);

        return res.status(200).json({
            success: true,
            data: { totalUsers, totalProducts, totalOrder, totalRevenue, recentOrders, orderSummary }
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || "Failed to load dashboard stats" });
    }
};

export const getAdminUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find()
            .select("name email image role createdAt")
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();

        const userIds = users.map((user) => user._id);
        const orderStats = await Order.aggregate([
            { $match: { user: { $in: userIds } } },
            { $group: { _id: "$user", orderCount: { $sum: 1 }, totalSpent: { $sum: "$totalAmount" } } }
        ]);

        const stats = new Map(orderStats.map((item) => [String(item._id), item]));
        const data = users.map((user) => {
            const stat = stats.get(String(user._id));
            return {
                ...user,
                orderCount: stat?.orderCount || 0,
                totalSpent: stat?.totalSpent || 0,
            };
        });

        return res.status(200).json({ success: true, users: data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: "Failed to load users" });
    }
};

export const updateAdminUser = async (req: Request, res: Response) => {
    try {
        const { name, email, role } = req.body || {};
        if (!name?.trim() || !email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ success: false, message: "Valid name and email are required" });
        }
        if (role !== "user" && role !== "admin") {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ success: false, message: "User not found" });

        if (target.role === "admin" && role !== "admin") {
            const adminCount = await User.countDocuments({ role: "admin" });
            if (adminCount <= 1) return res.status(409).json({ success: false, message: "Cannot remove the last admin" });
        }

        const emailOwner = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: target._id } }).lean();
        if (emailOwner) return res.status(409).json({ success: false, message: "Email is already in use" });

        target.name = name.trim();
        target.email = email.trim().toLowerCase();
        target.role = role;
        await target.save();

        return res.status(200).json({ success: true, user: target });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: "Failed to update user" });
    }
};

export const deleteAdminUser = async (req: Request, res: Response) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ success: false, message: "User not found" });

        if (target.role === "admin") {
            const adminCount = await User.countDocuments({ role: "admin" });
            if (adminCount <= 1) return res.status(409).json({ success: false, message: "Cannot delete the last admin" });
        }

        const currentUser = (req as any).user;
        if (String(target._id) === String(currentUser?._id)) {
            return res.status(400).json({ success: false, message: "You cannot delete your own admin account" });
        }

        await User.findByIdAndDelete(target._id);
        return res.status(200).json({ success: true, message: "User deleted" });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: "Failed to delete user" });
    }
};
