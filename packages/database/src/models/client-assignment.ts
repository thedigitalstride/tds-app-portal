import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClientAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
}

const clientAssignmentSchema = new Schema<IClientAssignment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound unique index: user can only be assigned to a client once
clientAssignmentSchema.index({ userId: 1, clientId: 1 }, { unique: true });
clientAssignmentSchema.index({ userId: 1 });
clientAssignmentSchema.index({ clientId: 1 });

export const ClientAssignment: Model<IClientAssignment> =
  mongoose.models.ClientAssignment ||
  mongoose.model<IClientAssignment>('ClientAssignment', clientAssignmentSchema);
