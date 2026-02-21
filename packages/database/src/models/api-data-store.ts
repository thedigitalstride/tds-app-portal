import mongoose, { Schema, Document, Model } from 'mongoose';

// ---- ApiDataRow ----

export interface IApiDataRow extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  sourceType: string;
  sourceAccountId: string;
  sourceAccountName: string;
  compositeKey: string;
  data: Record<string, unknown>;
  entityLevel: string;
  entityId?: string;
  entityName?: string;
  dateStart: Date;
  dateStop: Date;
  breakdowns?: Record<string, unknown>;
  fetchId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const apiDataRowSchema = new Schema<IApiDataRow>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    sourceType: { type: String, required: true },
    sourceAccountId: { type: String, required: true },
    sourceAccountName: { type: String, required: true },
    compositeKey: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    entityLevel: { type: String, required: true },
    entityId: { type: String },
    entityName: { type: String },
    dateStart: { type: Date, required: true },
    dateStop: { type: Date, required: true },
    breakdowns: { type: Schema.Types.Mixed },
    fetchId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiFetchLog',
      required: true,
    },
  },
  { timestamps: true }
);

// Core query path
apiDataRowSchema.index({ clientId: 1, sourceType: 1, sourceAccountId: 1, dateStart: -1 });
// Dedup key — unique per client + source
apiDataRowSchema.index({ clientId: 1, sourceType: 1, compositeKey: 1 }, { unique: true });

export const ApiDataRow: Model<IApiDataRow> =
  mongoose.models.ApiDataRow || mongoose.model<IApiDataRow>('ApiDataRow', apiDataRowSchema);

// ---- ApiFetchLog ----

export type ApiFetchStatus = 'success' | 'partial' | 'error';

export interface IApiFetchLog extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  sourceType: string;
  sourceAccountId: string;
  queryParams: Record<string, unknown>;
  rowCount: number;
  upsertedCount: number;
  durationMs: number;
  status: ApiFetchStatus;
  error?: string;
  fetchedBy: mongoose.Types.ObjectId;
  fetchedAt: Date;
}

const apiFetchLogSchema = new Schema<IApiFetchLog>({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  sourceType: { type: String, required: true },
  sourceAccountId: { type: String, required: true },
  queryParams: { type: Schema.Types.Mixed, default: {} },
  rowCount: { type: Number, default: 0 },
  upsertedCount: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'partial', 'error'], required: true },
  error: { type: String },
  fetchedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fetchedAt: { type: Date, default: Date.now },
});

apiFetchLogSchema.index({ clientId: 1, sourceType: 1, fetchedAt: -1 });

export const ApiFetchLog: Model<IApiFetchLog> =
  mongoose.models.ApiFetchLog || mongoose.model<IApiFetchLog>('ApiFetchLog', apiFetchLogSchema);

// ---- Composite key builder for Meta ----

export function buildMetaCompositeKey(
  row: Record<string, unknown>,
  breakdownKeys: string[]
): string {
  const parts: string[] = [
    String(row.date_start ?? ''),
    String(row.date_stop ?? ''),
    String(row.account_id ?? ''),
    String(row.campaign_id ?? ''),
    String(row.adset_id ?? ''),
    String(row.ad_id ?? ''),
  ];

  for (const key of breakdownKeys.sort()) {
    parts.push(`${key}=${String(row[key] ?? '')}`);
  }

  return parts.join('|');
}
