import express from 'express';
import { getDashboardStats, getAdminUsers, updateAdminUser, deleteAdminUser } from '../controllers/adminController.js';
import { authorize, protect } from '../middlewares/auth.js';

const AdminRoutes = express.Router();

AdminRoutes.get('/stats', protect, authorize('admin'), getDashboardStats);
AdminRoutes.get('/users', protect, authorize('admin'), getAdminUsers);
AdminRoutes.put('/users/:id', protect, authorize('admin'), updateAdminUser);
AdminRoutes.delete('/users/:id', protect, authorize('admin'), deleteAdminUser);

export default AdminRoutes