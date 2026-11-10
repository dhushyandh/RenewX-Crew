import mongoose, { Schema } from "mongoose";

const wishlistSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
}, { timestamps: true });

wishlistSchema.index({ user: 1 });
const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;
