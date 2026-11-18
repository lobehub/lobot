import useSWR from 'swr';

import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { contactService } from '@/services/contact';
import { contactSelectors, useContactStore } from '@/store/contact';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

/** Outside the personal space, its requests poll on the rail's idle cadence. */
const PERSONAL_REQUESTS_REFRESH_MS = 60_000;

/**
 * Friend requests waiting for the user in the personal space, badged on its rail tile. They
 * belong to no workspace, so a workspace's Contacts never lists them: from there the tile is
 * the only sign of one. In the personal space it reads the list its Contacts tab already loads.
 */
export const usePersonalRequestCount = (active: boolean): number => {
  const enabled = useChannelsEnabled();
  const userId = useUserStore(userProfileSelectors.userId);

  const activeCount = useContactStore((s) =>
    active ? contactSelectors.incomingRequests(s).length : 0,
  );

  const { data: otherCount = 0 } = useSWR(
    enabled && !active && userId ? ['workspace-rail-personal-requests', userId] : null,
    async () =>
      (await contactService.listRequestsInScope(null)).filter(
        (request) => request.direction === 'incoming',
      ).length,
    { refreshInterval: PERSONAL_REQUESTS_REFRESH_MS },
  );

  if (!enabled) return 0;
  return active ? activeCount : otherCount;
};
