import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

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

  contactActions.useFetchPersonalRequests(enabled && !active && !!userId);
  const otherCount = useContactStore(contactSelectors.personalIncomingCount);

  if (!enabled) return 0;
  return active ? activeCount : otherCount;
};
