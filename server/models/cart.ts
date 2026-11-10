import mongoose, { Schema } from "mongoose";
import { ICart, ICartItem } from "../types/index.js";

const cartItemSchema = new Schema<ICartItem>({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    // Optional variant for legacy catalogue items; electronics do not require clothing sizes.
    size: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 }
});

const cartSchema = new Schema<ICart>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

cartSchema.methods.calculateTotal = function (this: ICart) {
    this.totalAmount = this.items.reduce((total: number, item: ICartItem) => total + item.price * item.quantity, 0);
    return this.totalAmount;
};

cartSchema.pre("save", function () {
    this.calculateTotal();
});

const Cart = mongoose.model<ICart>("Cart", cartSchema);
export default Cart;
