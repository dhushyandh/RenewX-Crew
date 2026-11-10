import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.js";
import connectDB from "../config/db.js";

const makeAdmin = async () => {
    try {
        await connectDB();
        const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        if (!email) throw new Error("ADMIN_EMAIL environment variable is not set");
        const user = await User.findOne({ email });
        if (!user) throw new Error(`User with email ${email} not found. Register this account first.`);
        await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });
        console.log(`User ${email} is now an admin.`);
    } catch (error) {
        console.error("Error making user admin:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};
makeAdmin();
