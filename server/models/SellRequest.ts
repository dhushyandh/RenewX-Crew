import mongoose, { Schema } from "mongoose";

const sellRequestSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceType: { type: String, enum: ["Phone", "Laptop", "Tablet", "Audio", "Wearable", "Other"], required: true },
    brand: { type: String, required: true, trim: true, maxlength: 80 },
    model: { type: String, required: true, trim: true, maxlength: 120 },
    condition: { type: String, enum: ["Like new", "Good", "Fair", "Needs repair"], required: true },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    images: { type: [String], default: [] },
    status: { type: String, enum: ["submitted", "under_review", "offer_made", "accepted", "rejected", "completed"], default: "submitted", index: true },
    offerAmount: { type: Number, min: 0 },
    adminNotes: { type: String, maxlength: 2000 },
}, { timestamps: true });

sellRequestSchema.index({ user: 1, createdAt: -1 });
const SellRequest = mongoose.model("SellRequest", sellRequestSchema);
export default SellRequest;
