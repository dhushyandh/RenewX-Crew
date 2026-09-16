import { Request, Response } from "express"
import User from "../models/user.js"
import Product from "../models/Products.js"
import Order from "../models/order.js"


// Get Dashboard stats -> GET /api/admin/stats

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const totalUsers = await User.countDocuments()
        const totalProducts = await Product.countDocuments()
        const totalOrder = await Order.countDocuments()

        const validOrder = await Order.find({ orderStatus: { $ne: 'cancelled' } })

        const totalRevenue = validOrder.reduce((sum, order) => sum + order.totalAmount, 0)

        const recentOrders = await Order.find().sort('-createdAt').limit(5).populate('user', 'name email')

        const orderSummary = await Order.aggregate([
            {
                $group:{
                    _id: '$orderStatus',
                    count:{$sum:1}
                }
            }
        ])
        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalProducts,
                totalOrder,
                totalRevenue,
                recentOrders,
                orderSummary
            }
        })

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

