import mongoose, { Schema } from "mongoose";
import { IProduct } from "../types/index.js";

const productSchema = new Schema<IProduct>({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    images: { type: [String] },
    sizes: [{ type: String, required: true }],
    category: { type: String, required: true, enum: ['Men', 'Women', 'Kids', 'Shoes', 'Bags', 'Bag', 'Other'], default: 'Other' },
    stock: { type: Number, required: true, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
}, { timestamps: true })

productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' })

const Product = mongoose.model<IProduct>('Product', productSchema)
export default Product