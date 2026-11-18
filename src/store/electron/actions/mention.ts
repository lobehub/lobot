import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { notificationService } from '@/services/notification';
import { type StoreSetter } from '@/store/types';

import { type WorkspaceMentionRow, workspaceMentionsResource } from '../projection';
import { type ElectronStore } from '../store';

/** Page size of one poll: comfortably above the per-poll banner cap, so a burst is still diffed whole. */
export const WORKSPACE_MENTION_PAGE_SIZE = 15;

type Setter = StoreSetter<ElectronStore>;
export const createWorkspaceMentionSlice = (
  set: Setter,
  get: () => ElectronStore,
  _api?: unknown,
) => new WorkspaceMentionActionImpl(set, get, _api);

class WorkspaceMentionActionImpl {
  readonly #mentions;

  constructor(set: Setter, get: () => ElectronStore, _api?: unknown) {
    void _api;
    this.#mentions = createReplicaSlice(workspaceMentionsResource, {
      actionPrefix: 'workspaceMentions',
      fetcher: () =>
        notificationService.list({
          category: 'mention',
          isRead: false,
          limit: WORKSPACE_MENTION_PAGE_SIZE,
        }),
      get,
      set,
      stateKey: 'workspaceMentionsReplica',
      view: recordLens<ElectronStore, WorkspaceMentionRow[]>('workspaceMentionsMap'),
    });
  }

  /**
   * Poll the unread mentions of the active workspace. `onPoll` receives every
   * network answer (never the persisted copy), so a caller diffing polls does
   * not mistake a previous launch's rows for a fresh baseline.
   */
  useFetchWorkspaceMentions = (
    workspaceId: string | null | undefined,
    {
      enabled = true,
      interval,
      onPoll,
    }: {
      enabled?: boolean;
      interval: number;
      onPoll?: (rows: WorkspaceMentionRow[]) => void;
    },
  ): ReplicaSyncResult =>
    this.#mentions.useSync(workspaceId, {
      dedupingInterval: interval / 2,
      enabled: enabled && !!workspaceId,
      onSuccess: onPoll,
      refreshInterval: interval,
      // The banner matters most while the window is minimized or in the background.
      refreshWhenHidden: true,
    });
}

export type WorkspaceMentionAction = Pick<
  WorkspaceMentionActionImpl,
  keyof WorkspaceMentionActionImpl
>;
