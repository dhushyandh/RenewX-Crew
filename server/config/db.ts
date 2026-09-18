import mongoose from "mongoose";

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    mongoose.connection.on("connected", () => {
        console.log("✅ MongoDB connected successfully!");
    });

    mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected.");
    });

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            socketTimeoutMS: 10000,
        });
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error);
        throw error;
    }
};

export default connectDB;
