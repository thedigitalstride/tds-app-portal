import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAiUsageLog extends Document {
  toolId: string;
  userId: Types.ObjectId;
  clientId?: Types.ObjectId;
  purpose: string;
  provider: string;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  totalCost: number;
  resourceId?: string;
  resourceType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiUsageLogSchema = new Schema<IAiUsageLog>(
  {
    toolId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    purpose: { type: String, required: true },
    provider: { type: String, required: true },
    aiModel: { type: String, required: true },
    inputTokens: { type: Number, required: true, default: 0 },
    outputTokens: { type: Number, required: true, default: 0 },
    inputCostPer1M: { type: Number, required: true, default: 0 },
    outputCostPer1M: { type: Number, required: true, default: 0 },
    totalCost: { type: Number, required: true, default: 0 },
    resourceId: { type: String },
    resourceType: { type: String },
  },
  { timestamps: true }
);

aiUsageLogSchema.index({ createdAt: 1 });
aiUsageLogSchema.index({ toolId: 1, createdAt: 1 });
aiUsageLogSchema.index({ userId: 1, createdAt: 1 });
aiUsageLogSchema.index({ clientId: 1, createdAt: 1 });

export const AiUsageLog: Model<IAiUsageLog> =
  mongoose.models.AiUsageLog ||
  mongoose.model<IAiUsageLog>('AiUsageLog', aiUsageLogSchema);
