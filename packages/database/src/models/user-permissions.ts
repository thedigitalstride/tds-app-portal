import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserPermissions extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileIds: mongoose.Types.ObjectId[];
  grantedTools: string[];
  revokedTools: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userPermissionsSchema = new Schema<IUserPermissions>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    profileIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Profile',
      default: [],
    },
    grantedTools: {
      type: [String],
      default: [],
    },
    revokedTools: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userPermissionsSchema.index({ userId: 1 });

export const UserPermissions: Model<IUserPermissions> =
  mongoose.models.UserPermissions ||
  mongoose.model<IUserPermissions>('UserPermissions', userPermissionsSchema);
