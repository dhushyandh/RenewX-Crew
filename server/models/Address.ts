import mongoose from "mongoose";
import { IAddress } from "../types/index.js";

const AddressSchema = new mongoose.Schema<IAddress>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["Home", "Work", "Other"], required: true, default: "Home" },
    street: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    zipCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
    isDefault: { type: Boolean, default: false },
}, { timestamps: true });

AddressSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IAddress>("Address", AddressSchema);
