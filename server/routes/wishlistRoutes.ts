import express from "express";
import { protect } from "../middlewares/auth.js";
import { addWishlistItem, getWishlist, removeWishlistItem } from "../controllers/wishlistController.js";

const router = express.Router();
router.use(protect);
router.get("/", getWishlist);
router.post("/", addWishlistItem);
router.delete("/:productId", removeWishlistItem);
export default router;
