import type { AsyncTaskStatus } from '@/types/asyncTask';

const BASE_INTERVAL_MS = 1000;
/**
 * Cap for the normal polling interval. A long cap delays showing a finished
 * generation: with the former 30s cap, a multi-minute video stayed on screen as
 * "generating" for ~15s on average after it completed. The status
 * query is a cheap primary-key read, so a short cap is affordable.
 */
const MAX_INTERVAL_MS = 5000;
/** Cap once the last status request failed, so outages back off further. */
const MAX_ERROR_INTERVAL_MS = 10_000;
const REQUESTS_PER_BACKOFF_STEP = 5;

interface GenerationStatusPollingState {
  /** Whether the latest status request failed. */
  hasError: boolean;
  /** Number of status requests sent so far. */
  requestCount: number;
  /** Latest known task status. */
  status?: AsyncTaskStatus;
}
