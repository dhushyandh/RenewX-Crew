import express from "express";
import { protect } from "../middlewares/auth.js";
import { createPaymentOrder } from "../controllers/paymentController.js";

const paymentRoutes = express.Router();

paymentRoutes.post("/create-order", protect, createPaymentOrder);

export default paymentRoutes;
