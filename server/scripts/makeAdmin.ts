import "dotenv/config";
import User from "../models/user.js";
import connectDB from "../config/db.js";
import { clerkClient } from "@clerk/express";

const makeAdmin = async () => {
    try {
        await connectDB();

        const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

        if (!email) {
            throw new Error("ADMIN_EMAIL environment variable is not set");
        }

        const user = await User.findOne({ email });

        if (!user) {
            throw new Error(`User with email ${email} not found`);
        }

        if (!user.clerkId) {
            throw new Error(`User ${email} has no Clerk ID`);
        }

        user.role = "admin";
        await user.save();

        await clerkClient.users.updateUserMetadata(user.clerkId, {
            publicMetadata: { role: "admin" },
        });

        console.log(`✅ User ${email} is now an admin`);
    } catch (error) {
        console.error("❌ Error making user admin:", error);
        process.exitCode = 1;
    } finally {
        await import("mongoose").then(({ default: mongoose }) => mongoose.connection.close());
    }
};

makeAdmin();
