import express from 'express'
import { authorize, protect } from '../middlewares/auth.js'
import { getOrder, getOrders,createOrder,updateOrderStatus, getAllOrders } from '../controllers/ordersController.js'


const orderRoutes = express.Router()

orderRoutes.get('/', protect, getOrders)

orderRoutes.get('/:id', protect, getOrder)

orderRoutes.post('/', protect, createOrder)

orderRoutes.put('/:id/status', protect, authorize('admin'), updateOrderStatus)

orderRoutes.get('/admin/all', protect, authorize('admin'), getAllOrders)

export default orderRoutes