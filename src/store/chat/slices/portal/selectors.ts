import { ARTIFACT_TAG_CLOSED_REGEX, ARTIFACT_TAG_REGEX } from '@/const/plugin';
import { type ChatStoreState } from '@/store/chat';
import { type PortalArtifact } from '@/types/artifact';

import { dbMessageSelectors } from '../message/selectors';
import { topicSelectors } from '../topic/selectors';
import {
  createLocalFileScopeKey,
  createSandboxLocalFileScopeKey,
  getLocalFileTabId,
  isRemoteLocalFile,
} from './helpers';
import { type OpenLocalFileEntry, type PortalFile, type PortalViewData } from './initialState';
import { PortalViewType } from './initialState';

// ============== Core Stack Selectors ==============

const currentView = (s: ChatStoreState): PortalViewData | null => {
  const { portalStack } = s;
  return portalStack.at(-1) ?? null;
};

const currentViewType = (s: ChatStoreState): PortalViewType | null => {
  return currentView(s)?.type ?? null;
};

const canGoBack = (s: ChatStoreState): boolean => {
  return s.portalStack.length > 1;
};

// ============== Data Extractors ==============

// Helper to extract data from current view
const getViewData = <T extends PortalViewType>(
  s: ChatStoreState,
  type: T,
): Extract<PortalViewData, { type: T }> | null => {
  const view = currentView(s);
  if (view?.type === type) {
    return view as Extract<PortalViewData, { type: T }>;
  }
  return null;
};

const agentDetailId = (s: ChatStoreState): string | undefined => {
  const view = getViewData(s, PortalViewType.AgentDetail);
  return view?.agentId;
};

// Artifact selectors
const currentArtifact = (s: ChatStoreState): PortalArtifact | undefined => {
  const view = getViewData(s, PortalViewType.Artifact);
  return view?.artifact;
};

const artifactTitle = (s: ChatStoreState) => currentArtifact(s)?.title;
const artifactIdentifier = (s: ChatStoreState) => currentArtifact(s)?.identifier || '';
const artifactMessageId = (s: ChatStoreState) => currentArtifact(s)?.id;
const artifactType = (s: ChatStoreState) => currentArtifact(s)?.type;
const artifactCodeLanguage = (s: ChatStoreState) => currentArtifact(s)?.language;

// Escape special regex characters in a string
const escapeRegExp = (str: string) => str.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&');
const CODE_FENCE_START_REGEX = /^\s*```[^\n]*(?:\n|$)/;
const CODE_FENCE_END_REGEX = /\n```\s*$/;

const unwrapArtifactCodeBlock = (content: string) => {
  if (!CODE_FENCE_START_REGEX.test(content)) return content;

  return content.replace(CODE_FENCE_START_REGEX, '').replace(CODE_FENCE_END_REGEX, '');
};

const artifactMessageContent = (id: string) => (s: ChatStoreState) => {
  const message = dbMessageSelectors.getDbMessageById(id)(s);
  return message?.content || '';
};

const artifactCode = (id: string, identifier?: string) => (s: ChatStoreState) => {
  const messageContent = artifactMessageContent(id)(s);

  const regex = identifier
    ? new RegExp(
        `<lobeArtifact\\b[^>]*identifier="${escapeRegExp(identifier)}"[^>]*>(?<content>[\\S\\s]*?)(?:<\\/lobeArtifact>|$)`,
      )
    : ARTIFACT_TAG_REGEX;

  const result = messageContent.match(regex);
  let content = result?.groups?.content || '';

  content = unwrapArtifactCodeBlock(content);

  return content;
};

const isArtifactTagClosed = (id: string, identifier?: string) => (s: ChatStoreState) => {
  const content = artifactMessageContent(id)(s);

  if (identifier) {
    // Check if the specific artifact (by identifier) is closed
    const regex = new RegExp(
      `<lobeArtifact\\b[^>]*identifier="${escapeRegExp(identifier)}"[^>]*>[\\S\\s]*?<\\/lobeArtifact>`,
    );
    return regex.test(content || '');
  }

  return ARTIFACT_TAG_CLOSED_REGEX.test(content || '');
};

// Document selectors
const portalDocumentId = (s: ChatStoreState): string | undefined => {
  const view = getViewData(s, PortalViewType.Document);
  return view?.documentId;
};

const portalAgentDocumentId = (s: ChatStoreState): string | undefined => {
  const view = getViewData(s, PortalViewType.Document);
  return view?.agentDocumentId;
};

// File Preview selectors
const currentFile = (s: ChatStoreState): PortalFile | undefined => {
  const view = getViewData(s, PortalViewType.FilePreview);
  return view?.file;
};

const previewFileId = (s: ChatStoreState) => currentFile(s)?.fileId;
const chunkText = (s: ChatStoreState) => currentFile(s)?.chunkText;
const previewFileSource = (s: ChatStoreState) => currentFile(s)?.source;

// Local File selectors
const currentLocalFileScopeWorkingDirectory = (s: ChatStoreState): string | undefined =>
  s.topicDataMap ? topicSelectors.currentTopicWorkingDirectory(s) : undefined;

const currentLocalFileScopeKey = (s: ChatStoreState): string | undefined => {
  const workingDirectory = currentLocalFileScopeWorkingDirectory(s);
  return workingDirectory ? createLocalFileScopeKey(workingDirectory) : undefined;
};

const isLocalFileInCurrentScope = (s: ChatStoreState, file: OpenLocalFileEntry): boolean => {
  if (file.allowExternalFilePreview) return true;

  // Sandbox tabs carry no client-side working directory — scope them by the
  // topic whose sandbox serves the read; the cwd filter would drop them in
  // project-scoped topics.
  if (file.sandboxTopicId) return file.sandboxTopicId === s.activeTopicId;

  const workingDirectory = currentLocalFileScopeWorkingDirectory(s);
  return workingDirectory ? file.workingDirectory === workingDirectory : true;
};

const openLocalFiles = (s: ChatStoreState): OpenLocalFileEntry[] =>
  (s.openLocalFiles ?? []).filter((file) => isLocalFileInCurrentScope(s, file));

const activeLocalFileId = (s: ChatStoreState): string | undefined => {
  const files = openLocalFiles(s);
  const scopeKey = currentLocalFileScopeKey(s);
  // Without a cwd scope, the legacy global id may have been overwritten by a
  // sandbox tab activated in another unscoped topic — fall back to this
  // topic's own sandbox-scope entry before giving up.
  const scopedActiveIds = scopeKey
    ? [s.activeLocalFileIdsByScope?.[scopeKey]]
    : [
        s.activeLocalFileId,
        s.activeTopicId
          ? s.activeLocalFileIdsByScope?.[createSandboxLocalFileScopeKey(s.activeTopicId)]
          : undefined,
      ];

  for (const scopedActiveId of scopedActiveIds) {
    if (scopedActiveId && files.some((file) => getLocalFileTabId(file) === scopedActiveId)) {
      return scopedActiveId;
    }
  }

  const active = s.activeLocalFilePath;
  if (!active) return undefined;

  const file = files.find((item) => item.filePath === active);
  if (file) return getLocalFileTabId(file);

  return scopeKey && files[0] ? getLocalFileTabId(files[0]) : undefined;
};

const activeLocalFilePath = (s: ChatStoreState): string | undefined =>
  currentLocalFile(s)?.filePath ??
  (currentLocalFileScopeWorkingDirectory(s) ? undefined : s.activeLocalFilePath);

const currentLocalFile = (s: ChatStoreState): OpenLocalFileEntry | undefined => {
  const active = activeLocalFileId(s);
  if (!active) return undefined;
  const files = openLocalFiles(s);
  return (
    files.find((f) => getLocalFileTabId(f) === active) ?? files.find((f) => f.filePath === active)
  );
};

const isCurrentLocalFileRemote = (s: ChatStoreState): boolean =>
  isRemoteLocalFile(currentLocalFile(s));

// Edit buffers are keyed by tab identity (device + working directory + path),
// so callers pass the tab id rather than a bare file path.
const localFileBuffer =
  (tabId: string | undefined) =>
  (s: ChatStoreState): string | undefined =>
    tabId ? s.dirtyLocalFileContents[tabId] : undefined;

const dirtyLocalFileContents = (s: ChatStoreState): Record<string, string> =>
  s.dirtyLocalFileContents;

// Message Detail selectors
const messageDetailId = (s: ChatStoreState): string | undefined => {
  const view = getViewData(s, PortalViewType.MessageDetail);
  return view?.messageId;
};

// Topic chat selectors — the second, side-by-side topic opened in the portal
const portalTopicId = (s: ChatStoreState): string | undefined => {
  const view = getViewData(s, PortalViewType.Topic);
  return view?.topicId;
};

const topicCommentsView = (s: ChatStoreState) => getViewData(s, PortalViewType.TopicComments);
const topicCommentThreadView = (s: ChatStoreState) =>
  getViewData(s, PortalViewType.TopicCommentThread);
const browserPortal = (s: ChatStoreState) => getViewData(s, PortalViewType.Browser);

export const chatPortalSelectors = {
  // Core stack selectors
  currentView,
  currentViewType,
  canGoBack,

  // Agent detail data
  agentDetailId,

  // Artifact data
  currentArtifact,
  artifactTitle,
  artifactIdentifier,
  artifactMessageId,
  artifactType,
  artifactCodeLanguage,
  artifactCode,
  artifactMessageContent,
  isArtifactTagClosed,

  // Document data
  portalAgentDocumentId,
  portalDocumentId,

  // File preview data
  currentFile,
  previewFileId,
  previewFileSource,
  chunkText,

  // Local file data
  activeLocalFileId,
  activeLocalFilePath,
  currentLocalFile,
  isCurrentLocalFileRemote,
  dirtyLocalFileContents,
  localFileBuffer,
  openLocalFiles,

  // Message detail data
  messageDetailId,

  // Topic chat data
  portalTopicId,

  // Topic comment data
  topicCommentsView,
  topicCommentThreadView,

  // Browser data
  browserPortal,
};

export * from './selectors/thread';
