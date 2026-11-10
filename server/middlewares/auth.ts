import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const accessSecret = () => {
    const value = process.env.JWT_ACCESS_SECRET;
    if (!value || value.length < 32) throw new Error("JWT_ACCESS_SECRET must be at least 32 characters");
    return value;
};

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const header = req.headers.authorization;
        const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
        const token = bearer;
        if (!token) return res.status(401).json({ success: false, message: "Authentication required." });
        const payload = jwt.verify(token, accessSecret()) as jwt.JwtPayload;
        if (payload.typ !== "access" || typeof payload.sub !== "string") return res.status(401).json({ success: false, message: "Invalid access token." });
        const user = await User.findOne({ _id: payload.sub, isActive: true });
        if (!user) return res.status(401).json({ success: false, message: "Account is unavailable." });
        (req as any).user = user;
        return next();
    } catch (error: any) {
        if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
        console.error("Authentication middleware error:", error);
        return res.status(500).json({ success: false, message: "Authentication service error." });
    }
};

export const authorize = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!roles.includes(user.role)) return res.status(403).json({ success: false, message: "Forbidden." });
    return next();
};
