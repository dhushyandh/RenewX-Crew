import mongoose from 'mongoose'
import { IUser } from '../types/index.js'

const userSchema = new mongoose.Schema<IUser>(
    {
        name: {
            type: String,
            trim: true
        },
        email: { type: String, unique: true, trim: true },
        clerkId: { type: String, unique: true, sparse: true },
        image: { type: String },
        role: { type: String, enum: ['admin', 'user'], default: 'user' },
    },
    { timestamps: true }
)
const User = mongoose.model<IUser>('User', userSchema)
export default User;