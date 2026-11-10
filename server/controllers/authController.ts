import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const COOKIE_NAME = "renewx_refresh";
const ACCESS_COOKIE = "renewx_access";
const production = process.env.NODE_ENV === "production";
const cookieOptions = { httpOnly: true, secure: production, sameSite: (production ? "none" : "lax") as "none" | "lax", path: "/api/auth" };
const secret = (name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") => {
    const value = process.env[name];
    if (!value || value.length < 32) throw new Error(name + " must be at least 32 characters");
    return value;
};
const publicUser = (user: any) => ({ id: user._id.toString(), name: user.name, email: user.email, image: user.image || null, role: user.role });
const issueSession = (res: Response, user: any) => {
    const accessToken = jwt.sign({ sub: user._id.toString(), typ: "access" }, secret("JWT_ACCESS_SECRET"), { expiresIn: "15m" });
    const refreshToken = jwt.sign({ sub: user._id.toString(), ver: user.tokenVersion || 0, typ: "refresh" }, secret("JWT_REFRESH_SECRET"), { expiresIn: "30d" });
    res.cookie(COOKIE_NAME, refreshToken, { ...cookieOptions, maxAge: 30 * 86400000 });
    res.cookie(ACCESS_COOKIE, accessToken, { ...cookieOptions, path: "/api", maxAge: 15 * 60 * 1000 });
    return { accessToken, tokenType: "Bearer", expiresIn: 900, user: publicUser(user) };
};

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body || {};
        if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100 ||
            typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof password !== "string" || password.length < 8 || password.length > 72) {
            return res.status(400).json({ success: false, message: "Enter a valid name, email and password (8–72 characters)." });
        }
        const normalizedEmail = email.trim().toLowerCase();
        if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ success: false, message: "An account with this email already exists." });
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: "user" });
        return res.status(201).json({ success: true, data: issueSession(res, user) });
    } catch (error: any) {
        if (error?.code === 11000) return res.status(409).json({ success: false, message: "An account with this email already exists." });
        console.error("Registration error:", error);
        return res.status(500).json({ success: false, message: "Unable to create your account." });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body || {};
        if (typeof email !== "string" || typeof password !== "string" || password.length > 72) return res.status(400).json({ success: false, message: "Email and password are required." });
        const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true }).select("+passwordHash");
        if (!user || !await bcrypt.compare(password, user.passwordHash || "")) return res.status(401).json({ success: false, message: "Invalid email or password." });
        return res.status(200).json({ success: true, data: issueSession(res, user) });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Unable to sign in right now." });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (!token) return res.status(401).json({ success: false, message: "Refresh session is missing." });
        const payload = jwt.verify(token, secret("JWT_REFRESH_SECRET")) as jwt.JwtPayload;
        if (payload.typ !== "refresh" || typeof payload.sub !== "string") throw new Error("Invalid refresh token");
        const user = await User.findOne({ _id: payload.sub, isActive: true });
        if (!user || (user.tokenVersion || 0) !== payload.ver) throw new Error("Session revoked");
        return res.status(200).json({ success: true, data: issueSession(res, user) });
    } catch {
        res.clearCookie(COOKIE_NAME, cookieOptions);
        res.clearCookie(ACCESS_COOKIE, { ...cookieOptions, path: "/api" });
        return res.status(401).json({ success: false, message: "Your session has expired. Please sign in again." });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        await User.updateOne({ _id: (req as any).user._id }, { $inc: { tokenVersion: 1 } });
        res.clearCookie(COOKIE_NAME, cookieOptions);
        res.clearCookie(ACCESS_COOKIE, { ...cookieOptions, path: "/api" });
        return res.status(200).json({ success: true, message: "Signed out successfully." });
    } catch {
        return res.status(500).json({ success: false, message: "Unable to sign out." });
    }
};
export const me = async (req: Request, res: Response) => res.status(200).json({ success: true, data: publicUser((req as any).user) });
