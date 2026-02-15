import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'super-admin' | 'admin' | 'user';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
    },
    role: {
      type: String,
      enum: ['super-admin', 'admin', 'user'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite in development with hot reloading
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
