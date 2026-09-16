import express, { Router } from "express";
import { addToCart, clearCart, getCart, removeCartItem, updateCartItem } from "../controllers/cartController.js";
import { protect } from "../middlewares/auth.js";


const CartRoutes = express.Router()

CartRoutes.get('/',protect, getCart)
CartRoutes.post('/add', protect, addToCart)
CartRoutes.put('/update/:itemId', protect, updateCartItem)
CartRoutes.delete('/remove/:itemId', protect, removeCartItem)
CartRoutes.delete('/', protect, clearCart)

export default CartRoutes