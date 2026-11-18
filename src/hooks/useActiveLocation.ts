import { use, useCallback, useContext, useRef, useSyncExternalStore } from 'react';
import {
  type Location,
  UNSAFE_DataRouterContext,
  UNSAFE_LocationContext,
  useLocation,
} from 'react-router';

export const useActiveLocation = (): Location => useLocation();

const noopSubscribe = () => () => {};

/**
 * Subscribes to one value derived from the active location, re-rendering only when that value
 * changes. `useActiveLocation` re-renders on every navigation, which is what made every row of a
 * long list repaint each time the person opened another conversation.
 *
 * Expects:
 * - A selector returning a primitive (or otherwise stable) value; it runs on every navigation.
 */
export const useActiveLocationSelector = <T>(selector: (location: Location) => T): T => {
  const router = useContext(UNSAFE_DataRouterContext)?.router;
  const fromRouter = useSyncExternalStore(router ? router.subscribe : noopSubscribe, () =>
    router ? selector(router.state.location) : undefined,
  );
  // A plain `<MemoryRouter>` (tests) has no router to subscribe to; read its context instead.
  if (router) return fromRouter as T;
  return selector(use(UNSAFE_LocationContext).location);
};

/**
 * Returns a getter for the active location, for handlers that need where the person is when they
 * run. Reading it does not subscribe, so a navigation does not re-render the caller.
 */
export const useActiveLocationReader = (): (() => Location) => {
  const router = useContext(UNSAFE_DataRouterContext)?.router;
  const fallback = useRef<Location | undefined>(undefined);
  // A plain `<MemoryRouter>` (tests) has no router to read on demand; keep its latest location.
  if (!router) fallback.current = use(UNSAFE_LocationContext).location;
  return useCallback(() => (router ? router.state.location : fallback.current!), [router]);
};
