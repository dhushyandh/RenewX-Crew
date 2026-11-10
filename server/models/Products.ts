import mongoose, { Schema } from "mongoose";
import { IProduct } from "../types/index.js";

export const PRODUCT_CATEGORIES = [
    "Phones", "Laptops", "Tablets", "Audio", "Wearables", "Accessories",
    "Gaming", "Monitors", "Other",
    // Retained temporarily so existing legacy catalogue records remain valid.
    "Men", "Women", "Kids", "Shoes", "Bags", "Bag"
] as const;

const productSchema = new Schema<IProduct>({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    images: { type: [String], default: [] },
    // Optional for electronics; retained for legacy products that use variants.
    sizes: { type: [{ type: String }], default: [] },
    category: { type: String, required: true, enum: PRODUCT_CATEGORIES, default: "Other" },
    stock: { type: Number, required: true, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model<IProduct>("Product", productSchema);
export default Product;
