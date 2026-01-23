import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageStore extends Document {
  _id: mongoose.Types.ObjectId;
  url: string;
  urlHash: string;

  // Latest snapshot reference
  latestSnapshotId: mongoose.Types.ObjectId;
  latestFetchedAt: Date;

  // Snapshot management
  snapshotCount: number;

  // Access tracking
  clientsWithAccess: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const pageStoreSchema = new Schema<IPageStore>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    urlHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    latestSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'PageSnapshot',
    },
    latestFetchedAt: {
      type: Date,
    },
    snapshotCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clientsWithAccess: [{
      type: Schema.Types.ObjectId,
      ref: 'Client',
    }],
  },
  {
    timestamps: true,
  }
);

// Index for client access queries
pageStoreSchema.index({ clientsWithAccess: 1 });

// Delete cached model in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.PageStore) {
  delete mongoose.models.PageStore;
}

export const PageStore: Model<IPageStore> =
  mongoose.models.PageStore || mongoose.model<IPageStore>('PageStore', pageStoreSchema);
