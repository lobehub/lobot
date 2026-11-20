import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import {
  createReplicaSlice,
  createReplicaState,
  defineReplica,
  identityOnlyScope,
  recordLens,
  type ReplicaState,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { authSelectors, userProfileSelectors } from '@/store/user/selectors';

import { fetchPersonalSubscription } from './service';
import type { PersonalSubscription } from './types';

const SUBSCRIPTION_KEY = 'personal';

/** `null` is an account LobeHub Cloud has no subscription for. */
interface SubscriptionSnapshot {
  subscription: PersonalSubscription | null;
}

/**
 * The signed-in user's personal plan and usage. The same from every workspace, so partitioned by
 * identity only; persisted so the account menu shows its figure before the network answers.
 */
const personalSubscriptionResource = defineReplica<{ userId: string }, SubscriptionSnapshot>({
  key: () => SUBSCRIPTION_KEY,
  name: 'personalSubscription',
  scope: identityOnlyScope,
  storage: 'indexedDB',
  version: 1,
});

interface UsageState {
  subscriptionMap: Record<string, SubscriptionSnapshot>;
  subscriptionReplica: ReplicaState<SubscriptionSnapshot>;
}

export const useUsageStore = createWithEqualityFn<UsageState>()(
  () => ({ subscriptionMap: {}, subscriptionReplica: createReplicaState() }),
  shallow,
);

const subscriptionSlice = createReplicaSlice(personalSubscriptionResource, {
  actionPrefix: 'personalSubscription',
  fetcher: async () => ({ subscription: await fetchPersonalSubscription() }),
  get: useUsageStore.getState,
  set: useUsageStore.setState,
  stateKey: 'subscriptionReplica',
  view: recordLens<UsageState, SubscriptionSnapshot>('subscriptionMap'),
});

/** `undefined` until loaded, `null` without a subscription. */
export const usePersonalSubscription = () =>
  useUsageStore((s) => s.subscriptionMap[SUBSCRIPTION_KEY]?.subscription);

/**
 * Usage is shown only for the personal space of a LobeHub Cloud account: a self-hosted server has
 * no subscriptions, and a workspace is billed by its own plan.
 */
export const useUsageAvailable = () => {
  const business = useServerConfigStore(serverConfigSelectors.enableBusinessFeatures);
  const signedIn = useUserStore(authSelectors.isLogin);
  const workspaceId = useActiveWorkspaceId();
  return business && !!signedIn && workspaceId === null;
};

export const useFetchPersonalSubscription = (): ReplicaSyncResult => {
  const available = useUsageAvailable();
  const userId = useUserStore(userProfileSelectors.userId);
  return subscriptionSlice.useSync(available && userId ? { userId } : null, {
    dedupingInterval: 60_000,
  });
};
