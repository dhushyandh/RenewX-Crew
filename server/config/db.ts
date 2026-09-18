import mongoose from "mongoose";

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not configured.");
    if (mongoose.connection.readyState === 1) return;

    // Never let disconnected API queries sit in Mongoose buffering until the HTTP client times out.
    mongoose.set("bufferCommands", false);
    mongoose.set("bufferTimeoutMS", 5000);

    mongoose.connection.on("connected", () => console.log("✅ MongoDB connected successfully!"));
    mongoose.connection.on("error", (err) => console.error("❌ MongoDB connection error:", err));
    mongoose.connection.on("disconnected", () => console.warn("⚠️ MongoDB disconnected."));

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            maxPoolSize: 20,
            minPoolSize: 2,
        });
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error);
        throw error;
    }
};

export default connectDB;