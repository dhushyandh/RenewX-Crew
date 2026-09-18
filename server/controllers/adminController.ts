import { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import mongoose from "mongoose";
import User from "../models/user.js";
import Order from "../models/order.js";
import Product from "../models/Products.js";

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const [totalUsers, totalProducts, totalOrder, revenueAgg, recentOrders, orderSummary] =
            await Promise.all([
                User.countDocuments(),
                Product.countDocuments(),
                Order.countDocuments(),
                Order.aggregate([
                    { $match: { orderStatus: { $ne: "cancelled" } } },
                    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
                ]),
                Order.find()
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select("orderNumber totalAmount orderStatus paymentStatus createdAt user items")
                    .populate("user", "name email")
                    .lean(),
                Order.aggregate([
                    { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
                ]),
            ]);

        const totalRevenue = revenueAgg[0]?.total || 0;

        return res.status(200).json({
            success: true,
            data: { totalUsers, totalProducts, totalOrder, totalRevenue, recentOrders, orderSummary }
        });
    } catch (error) {
        console.error("Admin dashboard stats error:", error);
        return res.status(500).json({ success: false, message: "Failed to load dashboard stats" });
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
    } catch (error) {
        console.error("Admin users list error:", error);
        return res.status(500).json({ success: false, message: "Failed to load users" });
    }
};

export const updateAdminUser = async (req: Request, res: Response) => {
    try {
        const { name, email, role } = req.body || {};
        const targetId = req.params.id;

        if (!mongoose.isValidObjectId(targetId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        if (!name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim())) {
            return res.status(400).json({ success: false, message: "Valid name and email are required" });
        }

        if (role !== "user" && role !== "admin") {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        const target = await User.findById(targetId);
        if (!target) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Email is managed by Clerk. Changing it only in MongoDB would create
        // an identity mismatch and can be overwritten by the next Clerk webhook.
        const requestedEmail = String(email).trim().toLowerCase();
        if (requestedEmail !== String(target.email || "").trim().toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: "Email changes must be made through the authentication account",
            });
        }

        const currentUser = (req as any).user;
        const isSelf = String(target._id) === String(currentUser?._id);

        if (isSelf && target.role === "admin" && role !== "admin") {
            return res.status(400).json({
                success: false,
                message: "You cannot remove your own admin role",
            });
        }

        if (target.role === "admin" && role !== "admin") {
            const adminCount = await User.countDocuments({ role: "admin" });
            if (adminCount <= 1) {
                return res.status(409).json({
                    success: false,
                    message: "Cannot remove the last admin",
                });
            }
        }

        const emailOwner = await User.findOne({
            email: requestedEmail,
            _id: { $ne: target._id },
        }).lean();

        if (emailOwner) {
            return res.status(409).json({ success: false, message: "Email is already in use" });
        }

        const previousRole = target.role;

        if (target.clerkId && previousRole !== role) {
            try {
                await clerkClient.users.updateUserMetadata(target.clerkId, {
                    publicMetadata: { role },
                });
            } catch (error) {
                console.error("Failed to sync admin role to Clerk:", error);
                return res.status(503).json({
                    success: false,
                    message: "Authentication service temporarily unavailable",
                });
            }
        }

        try {
            target.name = name.trim();
            target.role = role;
            await target.save();
        } catch (error) {
            // Best-effort rollback so Clerk and MongoDB do not remain inconsistent.
            if (target.clerkId && previousRole !== role) {
                try {
                    await clerkClient.users.updateUserMetadata(target.clerkId, {
                        publicMetadata: { role: previousRole },
                    });
                } catch (rollbackError) {
                    console.error("CRITICAL: Failed to roll back Clerk role after database update failure:", rollbackError);
                }
            }
            throw error;
        }

        return res.status(200).json({ success: true, user: target });
    } catch (error) {
        console.error("Admin user update error:", error);
        return res.status(500).json({ success: false, message: "Failed to update user" });
    }
};

export const deleteAdminUser = async (req: Request, res: Response) => {
    try {
        const targetId = req.params.id;

        if (!mongoose.isValidObjectId(targetId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const target = await User.findById(targetId);
        if (!target) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const currentUser = (req as any).user;
        if (String(target._id) === String(currentUser?._id)) {
            return res.status(400).json({ success: false, message: "You cannot delete your own account" });
        }

        if (target.role === "admin") {
            const adminCount = await User.countDocuments({ role: "admin" });
            if (adminCount <= 1) {
                return res.status(409).json({
                    success: false,
                    message: "Cannot delete the last admin",
                });
            }
        }

        // The Clerk identity still exists after removing the local record.
        // Remove admin metadata first so a later login cannot recreate this
        // deleted local account with administrator privileges.
        if (target.clerkId && target.role === "admin") {
            try {
                await clerkClient.users.updateUserMetadata(target.clerkId, {
                    publicMetadata: { role: "user" },
                });
            } catch (error) {
                console.error("Failed to revoke Clerk admin metadata:", error);
                return res.status(503).json({
                    success: false,
                    message: "Authentication service temporarily unavailable",
                });
            }
        }

        await User.findByIdAndDelete(target._id);

        return res.status(200).json({ success: true, message: "User deleted" });
    } catch (error) {
        console.error("Admin user deletion error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete user" });
    }
};
