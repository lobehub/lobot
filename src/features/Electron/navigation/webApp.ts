import { CHANNEL_URL, OFFICIAL_URL } from '@lobechat/const';

import { getWorkspaceStoreState } from '@/business/client/workspace/store';
import { parseRootSegment, RESERVED_ROOT_SEGMENTS } from '@/features/Workspace/rootSegments';
import { buildWorkspaceAwarePath } from '@/features/Workspace/workspaceAwarePath';
import { electronSystemService } from '@/services/electron/system';
import { getElectronStoreState } from '@/store/electron';

/**
 * First path segments Lobot routes in-app. Everything else (`/agent/:id/profile`,
 * `/group/...`, `/memory`, `/community`, ...) exists only in the LobeHub web app,
 * which Lobot opens in the browser instead of an empty in-app page.
 * `webApp.test.ts` checks this set against the desktop route table.
 */
export const LOBOT_ROOT_SEGMENTS: ReadonlySet<string> = new Set([
  'agents',
  'channels',
  'desktop-onboarding',
  'onboarding',
  'settings',
]);

const LOBEHUB_CHANNEL_PATH =
  /^\/(?:project\/[^/?#]+\/)?channels\/([^/?#]+)(?:\/threads\/([^/?#]+))?\/?$/;

/**
 * Lobot's own path for a LobeHub link to one of its pages, such as a notification's. Lobot keeps
 * the workspace in the store, not the URL, so a `/:workspaceSlug` prefix is dropped; a Channel
 * opens without its project, and a Thread page path (`/channels/:id/threads/:threadId`)
 * becomes Lobot's `?thread=`. Any other path is returned unchanged.
 */
export const toLobotPath = (path: string): string => {
  const slug = parseRootSegment(path);
  // Any other first segment is a `/:workspaceSlug`.
  const unscoped =
    slug !== null && !RESERVED_ROOT_SEGMENTS.has(slug) ? path.slice(slug.length + 1) || '/' : path;
  const local = toLobotChannelPath(unscoped);
  // Only a page Lobot has loses the prefix; the web app still needs it for the rest.
  return isLobotPath(local) ? local : path;
};

const toLobotChannelPath = (path: string): string => {
  const [pathname, query = ''] = path.split(/(?=[?#])/, 2);
  const match = LOBEHUB_CHANNEL_PATH.exec(pathname);
  if (!match) return path;
  const [, channelId, threadId] = match;
  return threadId
    ? CHANNEL_URL(decodeURIComponent(channelId), decodeURIComponent(threadId))
    : `${CHANNEL_URL(decodeURIComponent(channelId))}${query}`;
};

/** Whether an absolute in-app path is one of Lobot's own pages, workspace prefix or not. */
export const isLobotPath = (path: string): boolean => {
  let segment = parseRootSegment(path);
  // Any other first segment is a `/:workspaceSlug`; the page is the one after it.
  if (segment !== null && !RESERVED_ROOT_SEGMENTS.has(segment))
    segment = parseRootSegment(path.slice(segment.length + 1));
  return segment === null || LOBOT_ROOT_SEGMENTS.has(segment);
};

/**
 * The LobeHub web app address for an in-app path, in the workspace the server
 * rail has selected. Lobot keeps that workspace in the store, not the URL, so
 * the web app's `/:workspaceSlug` prefix is added here.
 */
export const webAppUrl = (path: string): string => {
  const { activeWorkspaceId, workspaces } = getWorkspaceStoreState();
  const slug = workspaces.find((workspace) => workspace.id === activeWorkspaceId)?.slug ?? null;

  return `${webAppOrigin()}${buildWorkspaceAwarePath(path, slug)}`;
};

/** The LobeHub web app this client syncs with: the self-hosted server, else LobeHub Cloud. */
export const webAppOrigin = (): string => {
  const { dataSyncConfig } = getElectronStoreState();
  const base =
    dataSyncConfig.storageMode === 'selfHost' && dataSyncConfig.remoteServerUrl
      ? dataSyncConfig.remoteServerUrl
      : OFFICIAL_URL;

  return base.replace(/\/+$/, '');
};

export const openInWebApp = (path: string): void => {
  void electronSystemService.openExternalLink(webAppUrl(path));
};
