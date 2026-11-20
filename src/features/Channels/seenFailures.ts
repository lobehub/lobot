import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cacheScope } from '@/libs/replica';

/** How many seen failures a device remembers; older ones have long been settled or scrolled away. */
const SEEN_LIMIT = 200;

interface SeenFailuresState {
  /** `${cacheScope}:${jobId}` of failed replies the person jumped to, oldest first. */
  seen: string[];
}

/**
 * Failed replies the person has already looked at, on this device. The header's failure
 * indicator is a nudge to go and look; once they jumped to a failure it no longer nudges for it.
 * The failure itself stays in the conversation with its retry until a newer reply settles it.
 */
export const useSeenFailureStore = create<SeenFailuresState>()(
  persist(() => ({ seen: [] }) as SeenFailuresState, {
    name: 'LOBE_CHANNEL_SEEN_FAILURES',
    storage: createJSONStorage(() => localStorage),
  }),
);

const scopedKey = (scope: string, jobId: string) => `${scope}:${jobId}`;

/** Records that the person has looked at a failed reply. */
export const markFailureSeen = (jobId: string) => {
  const key = scopedKey(cacheScope.get(), jobId);
  const { seen } = useSeenFailureStore.getState();
  if (seen.includes(key)) return;
  useSeenFailureStore.setState({ seen: [...seen, key].slice(-SEEN_LIMIT) });
};

/** The failures the person has not looked at yet. */
export const useUnseenFailures = <T extends { id: string }>(jobs: T[]): T[] => {
  const scope = cacheScope.use();
  const seen = useSeenFailureStore((s) => s.seen);
  return jobs.filter((job) => !seen.includes(scopedKey(scope, job.id)));
};
