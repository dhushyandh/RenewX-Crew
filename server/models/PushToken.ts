import mongoose, { Document, Schema } from "mongoose";

export interface IPushToken extends Document {
    userId: string;
    token: string;
    platform: "android" | "ios" | "web";
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        platform: {
            type: String,
            enum: ["android", "ios", "web"],
            default: "android",
        },
        enabled: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Optimize multi-device query for active user tokens
PushTokenSchema.index({ userId: 1, enabled: 1 });

const PushToken = mongoose.models.PushToken || mongoose.model<IPushToken>("PushToken", PushTokenSchema);

export default PushToken;
