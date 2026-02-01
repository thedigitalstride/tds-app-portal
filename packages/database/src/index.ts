export { connectDB } from './connection';
export { User, type IUser, type UserRole } from './models/user';
export { Client, type IClient } from './models/client';
export { MetaTagAnalysis, type IMetaTagAnalysis, type IScanHistoryEntry } from './models/meta-tag-analysis';
export { PendingScan, type IPendingScan } from './models/pending-scan';
export { Feedback, type IFeedback, type IFeedbackNote, type FeedbackType, type FeedbackUrgency, type FeedbackStatus } from './models/feedback';
export { Profile, type IProfile } from './models/profile';
export { UserPermissions, type IUserPermissions } from './models/user-permissions';
export { ClientAssignment, type IClientAssignment } from './models/client-assignment';
export { PageSnapshot, type IPageSnapshot } from './models/page-snapshot';
export { PageStore, type IPageStore } from './models/page-store';
export { ScanBatch, type IScanBatch, type ISucceededUrl, type IFailedUrl, type ISkippedUrl, type ScanBatchStatus } from './models/scan-batch';
export { UrlBatch, type IUrlBatch, type IUrlBatchSucceeded, type IUrlBatchFailed, type UrlBatchStatus } from './models/url-batch';
export {
  PpcPageAnalysis,
  type IPpcPageAnalysis,
  // V2 types
  type IAdHeadline,
  type IAdDescription,
  type IAdKeyword,
  type IAdData,
  type IV2CategoryScores,
  type IV2Issue,
  type IV2Recommendation,
  type IMessageMatchItem,
  type IV2Summary,
  type IAnalysisV2,
} from './models/ppc-page-analysis';
export { normaliseUrl, hashUrl } from './utils/url-utils';
