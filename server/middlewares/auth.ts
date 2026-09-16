import { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import User from "../models/user.js";

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const auth = getAuth(req);
        const userId = auth?.userId || (req as any).auth?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - No auth token provided"
            });
        }

        let user = await User.findOne({ clerkId: userId });

        if (!user) {
            // Auto-sync user from Clerk in development or if webhook did not fire
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const primaryEmail = clerkUser.emailAddresses?.find(
                    (e) => e.id === clerkUser.primaryEmailAddressId
                )?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;

                const isAdmin = primaryEmail === process.env.ADMIN_EMAIL || clerkUser.publicMetadata?.role === 'admin';

                user = await User.findOneAndUpdate(
                    { $or: [{ clerkId: userId }, ...(primaryEmail ? [{ email: primaryEmail }] : [])] },
                    {
                        clerkId: userId,
                        email: primaryEmail || `${userId}@renewx.local`,
                        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
                        image: clerkUser.imageUrl,
                        role: isAdmin ? 'admin' : ((clerkUser.publicMetadata?.role as string) || 'user')
                    },
                    { upsert: true, new: true }
                );
            } catch (clerkErr) {
                console.error("Clerk fetch error in protect middleware:", clerkErr);
                // Fallback create user so user isn't blocked
                user = await User.create({
                    clerkId: userId,
                    email: process.env.ADMIN_EMAIL || 'admin@renewx.local',
                    name: 'Admin User',
                    role: 'admin'
                });
            }
        }

        if (user && user.role !== 'admin' && (user.email === process.env.ADMIN_EMAIL)) {
            user.role = 'admin';
            await user.save();
        }

        (req as any).user = user;
        next();
    } catch (error: any) {
        console.error('Auth error in protect middleware:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Authentication error'
        });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: `Unauthorized: required role [${roles.join(', ')}], current role [${user?.role || 'none'}]`
            });
        }
        next();
    };
};