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
export { CookieDomainConfig, type ICookieDomainConfig, type CookieConsentProvider } from './models/cookie-domain-config';
export {
  Idea,
  type IIdea,
  type IdeaStage,
  type IdeaStatus,
  type ScoreRecommendation,
  type IIdeaMessage,
  type IMessageOption,
  type IAttachment,
  type AttachmentType,
  type IStageData,
  type IIdeaScoring,
  type IScoreDimension,
  type IIdeaComment,
  type IIdeaVote,
  type ISeedData,
  type IShapeData,
  type IResearchData,
  type IRefineData,
  type IPrdData,
  type IPrdSection,
} from './models/idea';
export {
  IdeationPromptOverride,
  type IIdeationPromptOverride,
  type IdeationPromptKey,
  IDEATION_PROMPT_KEYS,
} from './models/ideation-prompt-override';
export { AiUsageLog, type IAiUsageLog } from './models/ai-usage-log';
export { normaliseUrl, hashUrl } from './utils/url-utils';
