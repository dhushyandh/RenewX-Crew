import Address from "../models/Address.js";
import { Request, Response } from "express";
import mongoose from "mongoose";

const clean = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed && trimmed.length <= maxLength ? trimmed : null;
};

const validateAddress = (body: any) => {
    const type = body?.type;
    const street = clean(body?.street, 200);
    const city = clean(body?.city, 100);
    const state = clean(body?.state, 100);
    const zipCode = clean(body?.zipCode, 20);
    const country = clean(body?.country, 100);
    if (!["Home", "Work", "Other"].includes(type) || !street || !city || !state || !zipCode || !country) return null;
    return { type, street, city, state, zipCode, country };
};

export const getAddresses = async (req: Request, res: Response) => {
    try {
        const addresses = await Address.find({ user: req.user.id }).sort("-createdAt");
        return res.status(200).json({ success: true, data: addresses });
    } catch (error) {
        console.error("Error fetching addresses:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch addresses" });
    }
};

export const addAddress = async (req: Request, res: Response) => {
    try {
        const data = validateAddress(req.body);
        if (!data) return res.status(400).json({ success: false, message: "Valid address fields are required" });

        const makeDefault = req.body?.isDefault === true;
        if (makeDefault) await Address.updateMany({ user: req.user.id }, { $set: { isDefault: false } });

        const hasAddress = await Address.exists({ user: req.user.id });
        const address = await Address.create({
            user: req.user.id,
            ...data,
            isDefault: makeDefault || !hasAddress,
        });
        return res.status(201).json({ success: true, data: address });
    } catch (error) {
        console.error("Error adding address:", error);
        return res.status(500).json({ success: false, message: "Failed to add address" });
    }
};

export const updateAddress = async (req: Request, res: Response) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid address ID" });
        }

        const data = validateAddress(req.body);
        if (!data) return res.status(400).json({ success: false, message: "Valid address fields are required" });

        const address = await Address.findOne({ _id: req.params.id, user: req.user.id });
        if (!address) return res.status(404).json({ success: false, message: "Address not found" });

        const makeDefault = req.body?.isDefault === true;
        if (makeDefault) {
            await Address.updateMany(
                { user: req.user.id, _id: { $ne: address._id } },
                { $set: { isDefault: false } }
            );
        }

        Object.assign(address, data, { isDefault: makeDefault });
        await address.save();
        return res.status(200).json({ success: true, data: address });
    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(500).json({ success: false, message: "Failed to update address" });
    }
};

export const deleteAddress = async (req: Request, res: Response) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid address ID" });
        }

        const address = await Address.findOne({ _id: req.params.id, user: req.user.id });
        if (!address) return res.status(404).json({ success: false, message: "Address not found" });

        await Address.deleteOne({ _id: address._id, user: req.user.id });

        if (address.isDefault) {
            const replacement = await Address.findOne({ user: req.user.id }).sort("-createdAt");
            if (replacement) {
                replacement.isDefault = true;
                await replacement.save();
            }
        }

        return res.status(200).json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error);
        return res.status(500).json({ success: false, message: "Failed to delete address" });
    }
};
