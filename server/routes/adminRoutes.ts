import express from 'express';
import { getDashboardStats } from '../controllers/adminController.js';
import { authorize, protect } from '../middlewares/auth.js';

const AdminRoutes = express.Router();

AdminRoutes.get('/stats', protect, authorize('admin'), getDashboardStats)

export default AdminRoutes