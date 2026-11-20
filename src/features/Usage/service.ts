import { lambdaClient } from '@/libs/trpc/client';

import type { PersonalSubscription } from './types';

/** LobeHub Cloud's personal subscription; a self-hosted server has no such router. */
export const fetchPersonalSubscription = async (): Promise<PersonalSubscription | null> =>
  (await lambdaClient.subscription.getSubscription.query()) ?? null;
