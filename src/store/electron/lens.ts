import { type ReplicaLens } from '@/libs/replica';

import { DESKTOP_SELF_KEY } from './projection';

/**
 * Lens of a single-entry replica (`DESKTOP_SELF_KEY`) whose view is a set of
 * flat store fields that existing readers keep using. `read` returns
 * `undefined` until the entry is loaded; `write(undefined)` restores defaults.
 */
export const selfFieldsLens = <TStore, TData>(
  read: (state: TStore) => TData | undefined,
  write: (data: TData | undefined) => Partial<TStore>,
): ReplicaLens<TStore, TData> => ({
  clear: () => write(undefined),
  get: (state, key) => (key === DESKTOP_SELF_KEY ? read(state) : undefined),
  keys: (state) => (read(state) === undefined ? [] : [DESKTOP_SELF_KEY]),
  set: (_state, key, data) => (key === DESKTOP_SELF_KEY ? write(data) : {}),
});
