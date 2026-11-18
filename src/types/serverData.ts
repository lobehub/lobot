/**
 * Row and result shapes the LobeHub server returns, kept from the removed `database`
 * package so the app can type what it receives.
 */
import type {
  AgentAccountCapabilities,
  AgentAccountCredentialHint,
  AgentAccountPersistedKind,
  AgentAccountSettings,
  AgentAccountStatus,
  GroupMemberAvatar,
  LobeDocumentPage,
  MetricActorType,
  MetricConfig,
  MetricKind,
  MetricPointSourceType,
  SidebarAgentLabel,
  SidebarVisibility,
  TaskItem,
  ToulminVerdict,
  UserMemoryEvidenceSource,
  VerifyCheckDecisionDetail,
  VerifyCheckDefinition,
  VerifyCheckItem,
  VerifyCheckResultMetadata,
  VerifyFlowSnapshot,
  VerifyRubricConfig,
  VerifyRunContext,
  VerifyRunDecisionDetail,
  VerifyRunMetadata,
  VerifyRunScenario,
  WorkspaceMemberConfig,
} from '@lobot/types';

export type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  primaryOwnerId: string;
  settings: unknown;
  frozen: boolean | null;
  frozenReason: string | null;
  frozenAt: Date | null;
};

export type WorkspaceMemberItem = {
  role: string;
  updatedAt: Date;
  workspaceId: string;
  userId: string;
  title: string | null;
  responsibilities: string | null;
  config: WorkspaceMemberConfig;
  joinedAt: Date;
  deletedAt: Date | null;
};

export type SidebarAgentItem = {
  avatar?: string | GroupMemberAvatar[] | null | undefined;
  backgroundColor?: string | null | undefined;
  description?: string | null | undefined;
  forkedFromIdentifier?: string | null | undefined;
  groupAvatar?: string | null | undefined;
  groupId?: string | null | undefined;
  heterogeneousType?: string | null | undefined;
  id: string;
  labels?: SidebarAgentLabel[] | undefined;
  model?: string | null | undefined;
  name?: string | null | undefined;
  pinned: boolean;
  slug?: string | null | undefined;
  title: string | null;
  type: 'agent' | 'group';
  unreadCount?: number | undefined;
  updatedAt: Date;
  userId?: string | null | undefined;
  visibility?: SidebarVisibility | undefined;
};

export type SidebarGroup = {
  id: string;
  items: SidebarAgentItem[];
  name: string;
  sort: number | null;
  visibility?: SidebarVisibility | undefined;
};

export type FtsSearchResult =
  | FtsSearchDatabaseResult
  | FtsSearchMCPResult
  | FtsSearchPluginResult
  | FtsSearchAssistantResult
  | FtsSearchTaskResult
  | FtsSearchGoalResult;

export type ChatGroupAgentItem = {
  role: string | null;
  accessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string | null;
  userId: string;
  chatGroupId: string;
  agentId: string;
  enabled: boolean | null;
  order: number | null;
};

export type ChatGroupItem = {
  id: string;
  description: string | null;
  avatar: string | null;
  accessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string | null;
  userId: string;
  title: string | null;
  config: ChatGroupConfig | null;
  deletedAt: Date | null;
  backgroundColor: string | null;
  marketIdentifier: string | null;
  content: string | null;
  editorData: Record<string, any> | null;
  clientId: string | null;
  visibility: 'private' | 'public';
  isDeleted: boolean | null;
  groupId: string | null;
  pinned: boolean | null;
};

export type NewChatGroup = {
  userId: string;
  id?: string | undefined;
  description?: string | null | undefined;
  avatar?: string | null | undefined;
  accessedAt?: Date | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
  workspaceId?: string | null | undefined;
  title?: string | null | undefined;
  config?: ChatGroupConfig | null | undefined;
  deletedAt?: Date | null | undefined;
  backgroundColor?: string | null | undefined;
  marketIdentifier?: string | null | undefined;
  content?: string | null | undefined;
  editorData?: Record<string, any> | null | undefined;
  clientId?: string | null | undefined;
  visibility?: 'private' | 'public' | undefined;
  isDeleted?: boolean | null | undefined;
  groupId?: string | null | undefined;
  pinned?: boolean | null | undefined;
};

export type NewChatGroupAgent = {
  userId: string;
  chatGroupId: string;
  agentId: string;
  role?: string | null | undefined;
  accessedAt?: Date | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
  workspaceId?: string | null | undefined;
  enabled?: boolean | null | undefined;
  order?: number | null | undefined;
};

export type GroupMemberRole = 'participant' | 'supervisor' | 'assistant';

export type DocumentItem = {
  id: string;
  slug: string | null;
  description: string | null;
  accessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string | null;
  userId: string;
  title: string | null;
  deletedAt: Date | null;
  content: string | null;
  editorData: Record<string, any> | null;
  clientId: string | null;
  visibility: 'private' | 'public';
  isDeleted: boolean | null;
  metadata: Record<string, any> | null;
  fileType: string;
  filename: string | null;
  totalCharCount: number;
  totalLineCount: number;
  pages: LobeDocumentPage[] | null;
  sourceType: 'agent' | 'topic' | 'file' | 'web' | 'api' | 'agent-signal';
  source: string;
  fileId: string | null;
  knowledgeBaseId: string | null;
  parentId: string | null;
  createdByAgentId: string | null;
};

export type SidebarAgentListResponse = {
  groups: SidebarGroup[];
  pinned: SidebarAgentItem[];
  privateGroups: SidebarGroup[];
  privatePinned: SidebarAgentItem[];
  privateUngrouped: SidebarAgentItem[];
  ungrouped: SidebarAgentItem[];
};

export type VerifyStatus =
  | 'unverified'
  | 'planned'
  | 'collecting_evidence'
  | 'verifying'
  | 'passed'
  | 'failed'
  | 'errored'
  | 'repairing'
  | 'delivered';

export type VerifyAutoRepairOutcome = 'declined' | 'spawned';

export type VerifyCheckResultItem = {
  id: string;
  createdAt: Date;
  workspaceId: string | null;
  userId: string;
  metadata: VerifyCheckResultMetadata | null;
  status: 'passed' | 'failed' | 'errored' | 'pending' | 'running' | 'skipped';
  startedAt: Date | null;
  completedAt: Date | null;
  operationId: string | null;
  userDecision: 'accepted' | 'rejected' | 'overridden' | null;
  verifyRunId: string | null;
  checkItemId: string;
  required: boolean;
  verifierType: 'agent' | 'program' | 'llm';
  sourceCriterionId: string | null;
  checkItemTitle: string | null;
  checkItemIndex: number | null;
  verifierConfigHash: string | null;
  verifierOperationId: string | null;
  verifierTracingId: string | null;
  verdict: 'passed' | 'failed' | 'uncertain' | null;
  confidence: number | null;
  toulmin: ToulminVerdict | null;
  suggestion: string | null;
  userDecisionDetail: VerifyCheckDecisionDetail | null;
  isFalsePositive: boolean | null;
  isFalseNegative: boolean | null;
  repairOperationId: string | null;
};

export type VerifyCriterionItem = {
  id: string;
  description: string | null;
  accessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string | null;
  userId: string;
  title: string;
  tags: string[];
  archivedAt: Date | null;
  definition: VerifyCheckDefinition | null;
  required: boolean;
  verifierType: 'agent' | 'program' | 'llm';
  verifierConfig: Record<string, unknown> | null;
  onFail: 'manual' | 'auto_repair';
  documentId: string | null;
};

export type VerifyRubricItem = {
  id: string;
  description: string | null;
  accessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string | null;
  userId: string;
  title: string;
  config: VerifyRubricConfig | null;
};

export type VerifyRunItem = {
  id: string;
  accessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string | null;
  userId: string;
  title: string | null;
  goal: string | null;
  visibility: 'private' | 'public' | 'owner';
  metadata: VerifyRunMetadata | null;
  source: 'agent' | 'agent-testing';
  status:
    | 'unverified'
    | 'planned'
    | 'collecting_evidence'
    | 'verifying'
    | 'passed'
    | 'failed'
    | 'errored'
    | 'repairing'
    | 'delivered'
    | null;
  acceptanceId: string | null;
  roundIndex: number | null;
  context: VerifyRunContext | null;
  operationId: string | null;
  scenario: VerifyRunScenario | null;
  plan: VerifyCheckItem[] | null;
  flowSnapshots: VerifyFlowSnapshot[] | null;
  planConfirmedAt: Date | null;
  userDecision: string | null;
  decisionDetail: VerifyRunDecisionDetail | null;
};

export const ConnectorToolPermission = {
  auto: 'auto',
  disabled: 'disabled',
  needs_approval: 'needs_approval',
} as const;

export type ConnectorToolPermission =
  (typeof ConnectorToolPermission)[keyof typeof ConnectorToolPermission];

export type DisplayContextMemory = {
  id: string;
  description: string | null;
  accessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  title: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  type: string | null;
  firstSeenAt: Date | null;
  associatedObjects:
    | {
        extra?: Record<string, unknown> | undefined;
        name?: string | undefined;
        type?: string | undefined;
      }[]
    | null;
  associatedSubjects:
    | {
        extra?: Record<string, unknown> | undefined;
        name?: string | undefined;
        type?: string | undefined;
      }[]
    | null;
  capturedAt: Date;
  currentStatus: string | null;
  lastEvidenceAt: Date | null;
  nextSteps: string[] | null;
  now: string | null;
  openQuestions: string[] | null;
  scoreImpact: number | null;
  scoreUrgency: number | null;
  synthesizedAt: Date | null;
  userMemoryId: string | null;
  userMemoryIds: string[] | null;
};

export type QueryIdentityRolesResult = {
  roles: { count: number; role: string }[];
  tags: { count: number; tag: string }[];
};

export type AddIdentityEntryResult = {
  identityId: string;
  userMemoryId: string;
};

export type DisplayPreferenceMemory = {
  title: string | null;
  id: string;
  accessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  type: string | null;
  capturedAt: Date;
  lastEvidenceAt: Date | null;
  userMemoryId: string | null;
  appliesToEntityId: string | null;
  conclusionDirectives: string | null;
  evidenceCount: number;
  evidenceSource: UserMemoryEvidenceSource | null;
  holderEntityId: string | null;
  scope: string | null;
  scorePriority: number | null;
  suggestions: string | null;
};

export type AgentDocumentContextPayload = {
  content: string;
  contentCharCount?: number | undefined;
  createdAt?: Date | undefined;
  description: string | null;
  documentId: string;
  filename: string;
  fileType: string;
  id: string;
  isFolder: boolean;
  loadRules: DocumentLoadRules;
  parentId: string | null;
  policy: AgentDocumentPolicy | null;
  policyLoad: PolicyLoad;
  policyLoadFormat: DocumentLoadFormat;
  policyLoadPosition: string;
  sourceType: 'agent' | 'topic' | 'file' | 'web' | 'api' | 'agent-signal';
  templateId: string | null;
  title: string;
  updatedAt: Date;
};

export type FtsSearchDatabaseResult =
  | FtsSearchPageResult
  | FtsSearchPageContentResult
  | FtsSearchAgentResult
  | FtsSearchChatGroupResult
  | FtsSearchTopicResult
  | FtsSearchFileResult
  | FtsSearchFolderResult
  | FtsSearchMessageResult
  | FtsSearchMemoryResult
  | FtsSearchKnowledgeBaseResult;

export interface FtsSearchMCPResult extends FtsSearchBaseResult {
  author: string;
  avatar?: string | null;
  category?: string | null;
  connectionType?: 'http' | 'stdio' | null;
  identifier: string;
  installCount?: number | null;
  isFeatured?: boolean | null;
  isValidated?: boolean | null;
  tags?: string[] | null;
  type: 'mcp';
}

export interface FtsSearchPluginResult extends FtsSearchBaseResult {
  author: string;
  avatar?: string | null;
  category?: string | null;
  identifier: string;
  tags?: string[] | null;
  type: 'plugin';
}

export interface FtsSearchAssistantResult extends FtsSearchBaseResult {
  author: string;
  avatar?: string | null;
  homepage?: string | null;
  identifier: string;
  tags?: string[] | null;
  type: 'communityAgent';
}

/** Task lookup result. Tasks are not indexed; `TaskSearchRepo` queries them directly. */
interface FtsSearchTaskResult extends FtsSearchBaseResult {
  /** Assignee agent, when the task is agent-assigned. */
  agentId: string | null;
  identifier: string;
  status: string;
  type: 'task';
}

/** Goal lookup result. Goals are not indexed; `GoalSearchRepo` queries them directly. */
interface FtsSearchGoalResult extends FtsSearchBaseResult {
  /** Supervising agent, when one is assigned. */
  agentId: string | null;
  completedAt: Date | null;
  projectId: string | null;
  status: string;
  type: 'goal';
}

export interface ChatGroupConfig {
  allowDM?: boolean;
  forkedFromIdentifier?: string;
  openingMessage?: string;
  openingQuestions?: string[];
  personal?: boolean;
  revealDM?: boolean;
  systemPrompt?: string;
}

/**
 * Minimal load options for plain text documents.
 */
export interface DocumentLoadRules {
  keywordMatchMode?: 'all' | 'any';
  keywords?: string[];
  maxTokens?: number;
  priority?: number;
  regexp?: string;
  rule?: DocumentLoadRule;
  timeRange?: {
    from?: string;
    to?: string;
  };
}

/**
 * Behavior policy for runtime rendering/retrieval.
 * Extensible by design for future context/retrieval strategies.
 */
export interface AgentDocumentPolicy {
  [key: string]: any;
  context?: {
    keywordMatchMode?: 'all' | 'any';
    keywords?: string[];
    policyLoadFormat?: DocumentLoadFormat;
    maxTokens?: number;
    mode?: 'append' | 'replace';
    position?: DocumentLoadPosition;
    priority?: number;
    regexp?: string;
    rule?: DocumentLoadRule;
    timeRange?: {
      from?: string;
      to?: string;
    };
    [key: string]: any;
  };
  retrieval?: {
    importance?: number;
    recencyWeight?: number;
    searchPriority?: number;
    [key: string]: any;
  };
}

/**
 * Policy load behavior for injection pipeline.
 */
export enum PolicyLoad {
  ALWAYS = 'always',
  DISABLED = 'disabled',
  PROGRESSIVE = 'progressive',
}

/**
 * Render format for injected agent document content.
 */
export enum DocumentLoadFormat {
  FILE = 'file',
  RAW = 'raw',
}

export interface FtsSearchPageResult extends FtsSearchBaseResult {
  id: string;
  type: 'page';
}

export interface FtsSearchPageContentResult extends FtsSearchBaseResult {
  id: string;
  type: 'pageContent';
}

export interface FtsSearchAgentResult extends FtsSearchBaseResult {
  avatar: string | null;
  backgroundColor: string | null;
  slug: string | null;
  tags: string[];
  type: 'agent';
}

export interface FtsSearchChatGroupResult extends FtsSearchBaseResult {
  avatar: string | null;
  backgroundColor: string | null;
  type: 'chatGroup';
}

export interface FtsSearchTopicResult extends FtsSearchBaseResult {
  agent: {
    avatar: string | null;
    backgroundColor: string | null;
    title: string | null;
  } | null;
  agentId: string | null;
  favorite: boolean | null;
  groupId: string | null;
  sessionId: string | null;
  type: 'topic';
}

export interface FtsSearchFileResult extends FtsSearchBaseResult {
  fileType: string;
  knowledgeBaseId: string | null;
  name: string;
  size: number;
  type: 'file';
  url: string | null;
}

export interface FtsSearchFolderResult extends FtsSearchBaseResult {
  knowledgeBaseId: string | null;
  slug: string | null;
  type: 'folder';
}

export interface FtsSearchMessageResult extends FtsSearchBaseResult {
  agentId: string | null;
  content: string;
  groupId: string | null;
  model: string | null;
  role: string;
  topicId: string | null;
  type: 'message';
}

export interface FtsSearchMemoryResult extends FtsSearchBaseResult {
  memoryLayer: string | null;
  type: 'memory';
}

export interface FtsSearchKnowledgeBaseResult extends FtsSearchBaseResult {
  avatar: string | null;
  type: 'knowledgeBase';
}

export interface FtsSearchBaseResult {
  createdAt: Date;
  description?: string | null;
  id: string;
  /** Normalized display relevance where lower is better. */
  relevance: number;
  title: string;
  type: FtsSearchResultType;
  updatedAt: Date;
}

/**
 * Plain text agent documents are always loadable by default.
 */
export enum DocumentLoadRule {
  ALWAYS = 'always',
  BY_KEYWORDS = 'by-keywords',
  BY_REGEXP = 'by-regexp',
  BY_TIME_RANGE = 'by-time-range',
}

/**
 * Load positions for Agent Documents in the context pipeline
 */
export enum DocumentLoadPosition {
  AFTER_FIRST_USER = 'after-first-user',
  AFTER_KNOWLEDGE = 'after-knowledge',
  BEFORE_FIRST_USER = 'before-first-user',
  BEFORE_KNOWLEDGE = 'before-knowledge',
  BEFORE_SYSTEM = 'before-system',
  CONTEXT_END = 'context-end',
  MANUAL = 'manual',
  ON_DEMAND = 'on-demand',
  SYSTEM_APPEND = 'system-append',
  SYSTEM_REPLACE = 'system-replace',
}

export type FtsSearchResultType =
  | 'page'
  | 'pageContent'
  | 'agent'
  | 'topic'
  | 'chatGroup'
  | 'file'
  | 'folder'
  | 'memory'
  | 'message'
  | 'mcp'
  | 'plugin'
  | 'communityAgent'
  | 'knowledgeBase'
  | 'task'
  | 'goal';

/** An agent account as every read returns it: the credential is absent, `hasCredential` says if one is set. */
export interface AgentAccountView {
  agentId: string;
  capabilities: AgentAccountCapabilities;
  createdAt: Date;
  credentialHint: AgentAccountCredentialHint | null;
  displayName: string | null;
  hasCredential: boolean;
  id: string;
  identifier: string;
  kind: AgentAccountPersistedKind;
  metadata: Record<string, unknown> | null;
  provider: string;
  revokedAt: Date | null;
  settings: AgentAccountSettings;
  status: AgentAccountStatus;
  updatedAt: Date;
  userId: string;
  workspaceId: string | null;
}

// ============================== Document history ==============================

export type DocumentHistorySaveSource = 'autosave' | 'llm_call' | 'manual' | 'restore' | 'system';

export interface DocumentHistoryListItem {
  agentId?: string | null;
  editorIds?: string[] | null;
  id: string;
  isCurrent: boolean;
  savedAt: string;
  saveSource: DocumentHistorySaveSource;
  userId: string;
}

export interface ListHistoryInput {
  beforeId?: string;
  beforeSavedAt?: string;
  documentId: string;
  includeCurrent?: boolean;
  limit?: number;
}

export interface ListHistoryOutput {
  items: DocumentHistoryListItem[];
  nextBeforeId?: string;
  nextBeforeSavedAt?: string;
}

export interface GetHistoryItemInput {
  documentId: string;
  historyId: string;
}

export interface GetHistoryItemOutput {
  editorData: Record<string, any> | null;
  id: string;
  isCurrent: boolean;
  savedAt: string;
  saveSource: DocumentHistorySaveSource;
}

export interface CompareHistoryItemsInput {
  documentId: string;
  fromHistoryId: string;
  toHistoryId: string;
}

export interface CompareHistoryItemState {
  editorData: Record<string, any> | null;
  id: string;
  isCurrent: boolean;
  savedAt: string;
  saveSource: DocumentHistorySaveSource;
}

export interface CompareHistoryItemsOutput {
  from: CompareHistoryItemState;
  to: CompareHistoryItemState;
}

export interface SaveDocumentHistoryInput {
  documentId: string;
  editorData: string;
  /** Edit-session id proving the client still holds the workspace page lease. */
  lockOwnerId?: string;
  saveSource: DocumentHistorySaveSource;
}

export interface SaveDocumentHistoryOutput {
  savedAt: string;
}

export interface UpdateDocumentInput {
  breakAutosaveWindow?: boolean;
  content?: string;
  editorData?: string;
  /** The save succeeds only if the stored row's `updatedAt` still equals this. */
  expectedUpdatedAt?: Date;
  fileType?: string;
  id: string;
  lockOwnerId?: string;
  metadata?: Record<string, any>;
  parentId?: string | null;
  restoreFromHistoryId?: string;
  saveSource?: DocumentHistorySaveSource;
  title?: string;
}

export interface UpdateDocumentOutput {
  historyAppended: boolean;
  id: string;
  savedAt?: string;
  updatedAt: string;
}

// ============================== Cloud sandbox ==============================

export interface CallToolResult {
  error?: { message: string; name?: string };
  result: any;
  sessionExpiredAndRecreated?: boolean;
  success: boolean;
}

export interface ExecInSandboxInput {
  params: Record<string, any>;
  toolName: string;
  topicId: string;
  /** Ignored by the server, which uses the caller's identity; older clients still send it. */
  userId?: string;
}

export interface ExportAndUploadFileInput {
  filename: string;
  path: string;
  topicId: string;
}

export interface ExportAndUploadFileResult {
  error?: { message: string };
  fileId?: string;
  filename: string;
  mimeType?: string;
  size?: number;
  success: boolean;
  url?: string;
}

// ============================== Sandbox storage ==============================

/** One file or folder of a drive listing; `path` is relative to the drive's root. */
export interface SandboxStorageFileEntry {
  isDirectory: boolean;
  /** A directory that is the top of a git checkout; absent where it is not. */
  isGitRepository?: boolean;
  modifiedAt?: string;
  name: string;
  path: string;
  size?: number;
}

export interface SandboxStorageFileList {
  entries: SandboxStorageFileEntry[];
  path: string;
  /** True when the listing hit the server-side entry cap. */
  truncated: boolean;
}

// ============================== Metric ==============================

/** One `metric_points` row as `metric.listSeriesWithPoints` serializes it. */
export interface MetricPointRecord {
  actorType: MetricActorType;
  observedAt: Date | string;
  sourceType: MetricPointSourceType;
  /** `numeric` column — may arrive as a decimal string. */
  value: number | string;
}

/** One series of `metric.listSeriesWithPoints`, with its recent window and first observation. */
export interface MetricSeriesWithPointsRecord {
  config: MetricConfig | null;
  firstPoint: MetricPointRecord | null;
  id: string;
  key: string;
  kind: MetricKind;
  points: MetricPointRecord[];
  title: string | null;
  unit: string | null;
}

// ============================== Agent quota ==============================

/** Where a referenced-mode credential lives on the device that reported it. */
export interface QuotaAccountCredentialRef {
  /** Custom CLI profile dir (CLAUDE_CONFIG_DIR / CODEX_HOME) if any. */
  configDir?: string;
  origin: 'keychain' | 'config-dir' | 'default-file';
}

/** An `agent_provider_accounts` row as `agentQuota.listAccounts` returns it (no `credentials`). */
export interface QuotaAccountItem {
  accessedAt: Date;
  createdAt: Date;
  credentialMode: string;
  credentialRef: QuotaAccountCredentialRef | null;
  displayName: string | null;
  email: string | null;
  enabled: boolean;
  externalAccountId: string | null;
  id: string;
  label: string | null;
  lastValidatedAt: Date | null;
  metadata: Record<string, unknown> | null;
  organizationId: string | null;
  planTier: string | null;
  provider: string;
  rateLimitTier: string | null;
  status: string;
  tokenExpiresAt: Date | null;
  updatedAt: Date;
  userId: string;
  visibility: 'private' | 'public';
  workspaceId: string | null;
}

/** An `agent_account_bindings` row: one account in one agent's pool. */
export interface QuotaBindingItem {
  accessedAt: Date;
  accountId: string;
  agentId: string;
  createdAt: Date;
  enabled: boolean;
  id: string;
  /** Lower = preferred when ordering the pool. */
  priority: number;
  role: string;
  updatedAt: Date;
  userId: string;
  /** Weighted round-robin weight within the pool. */
  weight: number;
  workspaceId: string | null;
}

// ============================== Topic ==============================

/** `topic.settleRunningOperation` outcome, by why the marker was (or was not) cleared. */
export type SettleRunningOperationResult =
  | { assistantMessageId?: string; status: 'corrected' | 'missing' }
  | { activeOperationId: string; status: 'conflict' | 'not_owner' }
  | { activeOperationId: string; operationStatus: string; status: 'in_flight' }
  | { assistantMessageId?: string; status: 'settled'; threadId?: string };

/** The visitor-safe subset of `metadata.runningOperation` a share visitor receives. */
export interface VisitorRunningOperation {
  assistantMessageId: string;
  heteroType?: string | null;
  operationId: string;
  scope?: string;
  startedAt?: string;
  threadId?: string | null;
}

/** One topic of `shareChat.getTopics`: the narrow DTO a share visitor sees. */
export interface VisitorTopicItem {
  createdAt: Date;
  id: string;
  runningOperation?: VisitorRunningOperation | null;
  title: string | null;
  updatedAt: Date;
}

// ============================== Project ==============================

export interface ProjectOverviewTask {
  id: string;
  identifier: string;
  name: string | null;
  status: string;
  /** Only the latest task carries one; the card shows it under the headline. */
  summary: string | null;
  updatedAt: Date;
}

export interface ProjectOverviewAgent {
  avatar: string | null;
  backgroundColor: string | null;
  id: string;
  name: string | null;
  title: string | null;
}

/** What a project folder card draws, as `project.listOverviews` returns it per project. */
export interface ProjectOverviewItem {
  agentCount: number;
  /** Members, the main agent first, at most three. */
  agents: ProjectOverviewAgent[];
  projectId: string;
  /** Last updated first, at most four. */
  recentTasks: ProjectOverviewTask[];
  taskCount: number;
  taskDoneCount: number;
}

// ============================== Task ==============================

/** One column of `task.groupList`; only the field its `groupBy` names is set. */
export interface TaskGroupListItem {
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  hasMore: boolean;
  key: string;
  /** Label column of a `label` board; null is the "no label" column. */
  labelId?: string | null;
  limit: number;
  offset: number;
  priority?: number;
  /** Project column of a `project` board; null is the "no project" column. */
  projectId?: string | null;
  tasks: TaskItem[];
  total: number;
}
