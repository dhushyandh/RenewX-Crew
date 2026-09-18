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
                message: "Unauthorized - No auth token provided",
            });
        }

        let user = await User.findOne({ clerkId: userId });

        if (!user) {
            try {
                // Webhooks normally create/sync users. This is a safe recovery path
                // for a valid Clerk user when the webhook has not arrived yet.
                const clerkUser = await clerkClient.users.getUser(userId);
                const primaryEmail =
                    clerkUser.emailAddresses?.find(
                        (email) => email.id === clerkUser.primaryEmailAddressId
                    )?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;

                if (!primaryEmail) {
                    return res.status(403).json({
                        success: false,
                        message: "Authenticated Clerk user has no email address",
                    });
                }

                // Never match an account by email alone. A Clerk identity must map
                // to its own clerkId to prevent account takeover through email collisions.
                const existingEmailUser = await User.findOne({ email: primaryEmail });

                if (existingEmailUser && existingEmailUser.clerkId !== userId) {
                    return res.status(409).json({
                        success: false,
                        message: "An account already exists for this email. Please contact support.",
                    });
                }

                const metadataRole =
                    clerkUser.publicMetadata?.role === "admin" ? "admin" : "user";

                user = await User.create({
                    clerkId: userId,
                    email: primaryEmail,
                    name:
                        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
                        "User",
                    image: clerkUser.imageUrl,
                    // Admin privileges may only be provisioned explicitly through
                    // trusted Clerk metadata. Never grant admin based on a request
                    // fallback or a client-controlled value.
                    role: metadataRole,
                });
            } catch (clerkErr: any) {
                console.error("Clerk user lookup/sync failed:", clerkErr);

                // Never create a local user when Clerk verification/retrieval fails.
                // A temporary identity-provider failure must not become an admin
                // privilege escalation or an unauthenticated account.
                return res.status(503).json({
                    success: false,
                    message: "Authentication service temporarily unavailable",
                });
            }
        }

        // Keep the database role authoritative for existing users. Do not promote
        // users based on email or request data.
        (req as any).user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication service error",
        });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (!roles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
            });
        }

        next();
    };
};
