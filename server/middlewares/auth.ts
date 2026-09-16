import { NextFunction, Request, Response } from "express";
import User from "../models/user.js";


export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = await req.auth();

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }
        let user = await User.findOne({ clerkId: userId })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }
        (req as any).user = user
        next()
    } catch (error: any) {
        console.error('Auth error:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes((req as any).user.role)) {
            return res.status(403).json({
                success: false,
                message: `Unauthorized to access this resource as ${req.user.role}`
            })
        }
        next()
    }
}