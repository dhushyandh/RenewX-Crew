import { Request, Response } from "express";
import mongoose from "mongoose";
import SellRequest from "../models/SellRequest.js";

const deviceTypes = ["Phone", "Laptop", "Tablet", "Audio", "Wearable", "Other"];
const conditions = ["Like new", "Good", "Fair", "Needs repair"];

export const createSellRequest = async (req: Request, res: Response) => {
    try {
        const { deviceType, brand, model, condition, notes = "", images = [] } = req.body || {};
        if (!deviceTypes.includes(deviceType) || !conditions.includes(condition) ||
            typeof brand !== "string" || !brand.trim() || brand.trim().length > 80 ||
            typeof model !== "string" || !model.trim() || model.trim().length > 120 ||
            typeof notes !== "string" || notes.length > 2000 ||
            !Array.isArray(images) || images.length > 6 ||
            images.some((url: unknown) => typeof url !== "string" || !/^https?:\/\//i.test(url))) {
            return res.status(400).json({ success: false, message: "Please provide valid device details and image URLs" });
        }
        const request = await SellRequest.create({
            user: req.user.id, deviceType, brand: brand.trim(), model: model.trim(),
            condition, notes: notes.trim(), images
        });
        return res.status(201).json({ success: true, data: request });
    } catch (error) {
        console.error("Create sell request error:", error);
        return res.status(500).json({ success: false, message: "Failed to submit device for review" });
    }
};

export const getMySellRequests = async (req: Request, res: Response) => {
    try {
        const data = await SellRequest.find({ user: req.user.id }).sort("-createdAt");
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Get sell requests error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch sell requests" });
    }
};

export const getAllSellRequests = async (_req: Request, res: Response) => {
    try {
        const data = await SellRequest.find().populate("user", "name email").sort("-createdAt");
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Admin sell requests error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch sell requests" });
    }
};

export const updateSellRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, offerAmount, adminNotes } = req.body || {};
        const allowed = ["under_review", "offer_made", "accepted", "rejected", "completed"];
        if (!mongoose.isValidObjectId(id) || !allowed.includes(status) ||
            (status === "offer_made" && (typeof offerAmount !== "number" || !Number.isFinite(offerAmount) || offerAmount < 0)) ||
            (adminNotes !== undefined && (typeof adminNotes !== "string" || adminNotes.length > 2000))) {
            return res.status(400).json({ success: false, message: "Invalid sell request update" });
        }
        const update: Record<string, unknown> = { status };
        if (offerAmount !== undefined) update.offerAmount = offerAmount;
        if (adminNotes !== undefined) update.adminNotes = adminNotes;
        const data = await SellRequest.findByIdAndUpdate(id, update, { new: true, runValidators: true }).populate("user", "name email");
        if (!data) return res.status(404).json({ success: false, message: "Sell request not found" });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Update sell request error:", error);
        return res.status(500).json({ success: false, message: "Failed to update sell request" });
    }
};
