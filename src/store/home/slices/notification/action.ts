import { createReplicaSlice, recordLens } from '@/libs/replica';
import { notificationService } from '@/services/notification';
import {
  type PendingTransferRequest,
  resourceTransferRequestService,
  type TransferManifest,
} from '@/services/resourceTransferRequest';
import type { HomeStore } from '@/store/home/store';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import {
  INBOX_NOTIFICATION_PAGE_SIZE,
  type InboxNavigationCount,
  inboxNavigationCountsResource,
  type InboxNotificationFeed,
  type InboxNotificationParams,
  inboxNotificationResource,
  pendingTransferRequestsResource,
  type TransferManifestParams,
  transferManifestResource,
} from './projection';

const n = setNamespace('homeNotification');

type Setter = StoreSetter<HomeStore>;
export const createHomeNotificationSlice = (set: Setter, get: () => HomeStore, _api?: unknown) =>
  new HomeNotificationActionImpl(set, get, _api);

/**
 * The header inbox modal: the notification stream, its sidebar counts and the
 * live transfer requests pinned above the stream. Each is a replica, so
 * reopening the modal after a reload paints the last answer while the server
 * confirms it. The unread badge (`inbox:unreadCount`) is a poll and stays on
 * SWR.
 */
class HomeNotificationActionImpl {
  constructor(set: Setter, get: () => HomeStore, _api?: unknown) {
    void _api;
    createReplicaSlice(inboxNotificationResource, {
      actionPrefix: n('notifications'),
      fetcher: async ({ category, isRead }: InboxNotificationParams, cursor?: string) => {
        const items = await notificationService.list({
          category,
          cursor,
          isRead,
          limit: INBOX_NOTIFICATION_PAGE_SIZE,
        });
        // The server pages by row id and reports no cursor: a short page ends the stream.
        return {
          items,
          nextCursor: items.length < INBOX_NOTIFICATION_PAGE_SIZE ? null : items.at(-1)!.id,
        };
      },
      get,
      set,
      stateKey: 'inboxNotificationsReplica',
      view: recordLens<HomeStore, InboxNotificationFeed>('inboxNotificationsMap'),
    });
    createReplicaSlice(inboxNavigationCountsResource, {
      actionPrefix: n('navigationCounts'),
      fetcher: () => notificationService.getNavigationCounts(),
      get,
      set,
      stateKey: 'inboxNavigationCountsReplica',
      view: recordLens<HomeStore, InboxNavigationCount[]>('inboxNavigationCountsMap'),
    });
    createReplicaSlice(pendingTransferRequestsResource, {
      actionPrefix: n('pendingTransfers'),
      fetcher: () => resourceTransferRequestService.listMine(),
      get,
      set,
      stateKey: 'pendingTransferRequestsReplica',
      view: recordLens<HomeStore, PendingTransferRequest[]>('pendingTransferRequestsMap'),
    });
    createReplicaSlice(transferManifestResource, {
      actionPrefix: n('transferManifest'),
      fetcher: ({ recipientId, resourceId, resourceType }: TransferManifestParams) =>
        resourceTransferRequestService.getManifest({ recipientId, resourceId, resourceType }),
      get,
      set,
      stateKey: 'transferManifestReplica',
      view: recordLens<HomeStore, TransferManifest>('transferManifestMap'),
    });
  }
}

export type HomeNotificationAction = Pick<
  HomeNotificationActionImpl,
  keyof HomeNotificationActionImpl
>;
