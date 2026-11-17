/**
 * Agent context shapes the app builds: agent documents, the Agent Builder snapshot and the
 * onboarding user. Moved here from the removed `@lobechat/context-engine` package.
 */
import type { AgentDocumentPolicyLoad } from '@lobot/types';

export type AgentDocumentLoadRule = 'always' | 'by-keywords' | 'by-regexp' | 'by-time-range';

export interface AgentDocumentLoadRules {
  keywordMatchMode?: 'all' | 'any';
  keywords?: string[];
  maxTokens?: number;
  priority?: number;
  regexp?: string;
  rule?: AgentDocumentLoadRule;
  timeRange?: {
    from?: string;
    to?: string;
  };
}

export const AGENT_DOCUMENT_INJECTION_POSITIONS = [
  'after-first-user',
  'before-first-user',
  'before-system',
  'context-end',
  'manual',
  'on-demand',
  'system-append',
  'system-replace',
] as const;

export type AgentDocumentInjectionPosition = (typeof AGENT_DOCUMENT_INJECTION_POSITIONS)[number];

export type AgentDocumentLoadFormat = 'file' | 'raw';

type AgentDocumentSourceType = 'agent' | 'agent-signal' | 'api' | 'file' | 'topic' | 'web';

export interface AgentContextDocument {
  content?: string;
  contentCharCount?: number;
  createdAt?: Date | string;
  description?: string;
  filename: string;
  /**
   * Title of the containing parent — a `custom/folder`, or an ordinary document
   * that holds nested docs (e.g. a workflow with its run records) — resolved at
   * the DB→context mapping boundary. Present only when the doc has such a
   * parent; used by the progressive index to fold siblings into one summary row.
   */
  folderTitle?: string;
  id?: string;
  loadPosition?: AgentDocumentInjectionPosition;
  loadRules?: AgentDocumentLoadRules;
  /**
   * Parent folder's `documentId` (the `documents.id` of the `custom/folder`
   * row). Doubles as the grouping key for folder folding and the value the
   * model passes to `listDocuments(parentId=…)` to expand a folded folder.
   */
  parentId?: string | null;
  /** What `parentId` points at; `document` parents fold under a 📄 row instead of 📁. */
  parentKind?: 'document' | 'folder';
  policyId?: string | null;
  policyLoad?: AgentDocumentPolicyLoad;
  policyLoadFormat?: AgentDocumentLoadFormat;
  sourceType?: AgentDocumentSourceType;
  title?: string;
  updatedAt?: Date | string;
}

/**
 * Official tool item for Agent Builder context
 */
interface OfficialToolItem {
  /** Tool description */
  description?: string;
  /** Whether the tool is enabled for current agent */
  enabled?: boolean;
  /** Tool identifier */
  identifier: string;
  /** Whether the tool is installed/connected */
  installed?: boolean;
  /** Tool display name */
  name: string;
  /** Tool type: 'builtin' for built-in tools, 'composio' for LobeHub Mcp servers, 'lobehub-skill' for LobeHub Skill providers */
  type: 'builtin' | 'composio' | 'lobehub-skill';
}

/**
 * Agent context for Agent Builder
 */
export interface AgentBuilderContext {
  /** Agent configuration */
  config?: {
    chatConfig?: Record<string, any>;
    model?: string;
    openingMessage?: string;
    openingQuestions?: string[];
    params?: Record<string, any>;
    plugins?: string[];
    provider?: string;
    systemRole?: string;
  };
  /** Agent metadata */
  meta?: {
    avatar?: string;
    backgroundColor?: string;
    description?: string;
    /** The agent's personal name, as opposed to `title` (the role it plays) */
    name?: string;
    tags?: string[];
    title?: string;
  };
  /** Available official tools (builtin tools, Composio integrations, and LobehubSkill providers) */
  officialTools?: OfficialToolItem[];
}

export interface OnboardingUserInfo {
  /** Best available display name candidate for address confirmation */
  displayName?: string;
  /** Account full name, if present */
  fullName?: string;
  /** Account username, if present */
  username?: string;
}
