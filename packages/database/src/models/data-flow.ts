import mongoose, { Schema, Document, Model } from 'mongoose';

// Subdocument interfaces — minimal serialisable shape for React Flow
export interface IFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface IFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
}

export interface IDataFlow extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  name: string;
  description?: string;

  // Flow state (serialised React Flow data)
  nodes: IFlowNode[];
  edges: IFlowEdge[];
  activeTableNodeId?: string;
  tableCounter: number;
  schemaCounter: number;
  joinCounter: number;

  // User tracking
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const flowNodeSchema = new Schema<IFlowNode>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const flowEdgeSchema = new Schema<IFlowEdge>(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    sourceHandle: { type: String },
    targetHandle: { type: String },
    animated: { type: Boolean },
  },
  { _id: false }
);

const dataFlowSchema = new Schema<IDataFlow>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    nodes: { type: [flowNodeSchema], default: [] },
    edges: { type: [flowEdgeSchema], default: [] },
    activeTableNodeId: { type: String },
    tableCounter: { type: Number, default: 0 },
    schemaCounter: { type: Number, default: 0 },
    joinCounter: { type: Number, default: 0 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// List flows by client, most recently updated first
dataFlowSchema.index({ clientId: 1, updatedAt: -1 });

export const DataFlow: Model<IDataFlow> =
  mongoose.models.DataFlow || mongoose.model<IDataFlow>('DataFlow', dataFlowSchema);
