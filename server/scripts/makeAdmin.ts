import "dotenv/config";
import User from "../models/user.js";
import connectDB from "../config/db.js";
import { clerkClient } from "@clerk/express";

const makeAdmin = async () => {
    try {
        await connectDB();
        const email = process.env.ADMIN_EMAIL;
        if (!email) {
            console.error("❌ ADMIN_EMAIL environment variable is not set");
            return;
        }

        const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { returnDocument: 'after' });

        if (!user) {
            console.error(`❌ User with email ${email} not found`);
                return;
        }

        await clerkClient.users.updateUserMetadata(user.clerkId as string, {
            publicMetadata: { role: 'admin' }
        });
        console.log(`✅ User ${email} is now an admin`);
    } catch (error) {
        console.error("❌ Error making user admin:", error);
    }
}

export default makeAdmin;