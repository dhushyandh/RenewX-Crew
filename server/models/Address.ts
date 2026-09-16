import mongoose from "mongoose";
import { IAddress } from "../types/index.js";


const AddressSchema = new mongoose.Schema<IAddress>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    type: { type: String, enum: ['Home', 'Work', 'Other'], required: true, default: 'Home' },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.model<IAddress>('Address', AddressSchema)