import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { getActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { useSingleton } from '@/hooks/useSingleton';
import { desktopNotificationService } from '@/services/electron/desktopNotification';
import { useElectronStore } from '@/store/electron';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import {
  type MentionNotificationRow,
  type MentionWatermark,
  pickNewMentions,
  toMentionNotificationParams,
} from './mentionNotification';

export const MENTION_POLL_INTERVAL = 30_000;

/**
 * Raises an OS notification when another workspace member @-mentions the user.
 *
 * Mentions land in the active workspace's inbox under the `mention` category;
 * this polls the unread ones and announces each one created after the newest
 * mention it has already seen.
 * The main process decides whether to show the banner (only while the window
 * is hidden or unfocused), so a user already looking at the app is not pinged
 * twice — the inbox bell still carries the mention.
 */
export const useWorkspaceMentionNotifier = (): void => {
  // Lobot only talks to LobeHub Cloud, so mentions are never behind the business-features flag.
  const isLogin = useUserStore(authSelectors.isLogin);
  const workspaceId = useActiveWorkspaceId();
  const muted = useGlobalStore((s) => systemStatusSelectors.channelNotificationLevel(s) === 'off');
  const enabled = isLogin === true && !!workspaceId && !muted;

  // Per workspace, so switching away and back doesn't re-announce old mentions.
  const watermarkByWorkspace = useSingleton(() => new Map<string, MentionWatermark>());

  const useFetchWorkspaceMentions = useElectronStore((s) => s.useFetchWorkspaceMentions);

  useFetchWorkspaceMentions(workspaceId, {
    enabled,
    interval: MENTION_POLL_INTERVAL,
    onPoll: (rows: MentionNotificationRow[]) => {
      if (!workspaceId) return;

      const { fresh, watermark } = pickNewMentions(rows, watermarkByWorkspace.get(workspaceId));
      watermarkByWorkspace.set(workspaceId, watermark);
      if (fresh.length === 0) return;

      const workspaceSlug = getActiveWorkspaceSlug();
      for (const row of fresh) {
        desktopNotificationService
          .showNotification(toMentionNotificationParams(row, workspaceSlug))
          .catch((error) => console.error('Workspace mention desktop notification failed:', error));
      }
    },
  });
};
