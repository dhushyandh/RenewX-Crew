import mongoose, { Document, Schema } from "mongoose";

export interface INotificationPreference extends Document {
    userId: string;
    orderUpdates: boolean;
    offers: boolean;
    general: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        orderUpdates: {
            type: Boolean,
            default: true,
        },
        offers: {
            type: Boolean,
            default: true,
        },
        general: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const NotificationPreference =
    mongoose.models.NotificationPreference ||
    mongoose.model<INotificationPreference>(
        "NotificationPreference",
        NotificationPreferenceSchema
    );

export default NotificationPreference;
