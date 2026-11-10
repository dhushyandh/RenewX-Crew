import express from "express";
import { authorize, protect } from "../middlewares/auth.js";
import { createSellRequest, getAllSellRequests, getMySellRequests, updateSellRequest } from "../controllers/sellRequestController.js";

const router = express.Router();
router.use(protect);
router.get("/", getMySellRequests);
router.post("/", createSellRequest);
router.get("/admin/all", authorize("admin"), getAllSellRequests);
router.patch("/:id", authorize("admin"), updateSellRequest);
export default router;
