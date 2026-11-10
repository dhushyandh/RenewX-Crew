import mongoose from "mongoose";
import { IUser } from "../types/index.js";

const userSchema = new mongoose.Schema<IUser>({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    image: { type: String },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
const User = mongoose.model<IUser>("User", userSchema);
export default User;
