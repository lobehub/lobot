import { useCallback, useContext, useSyncExternalStore } from 'react';
import { type Location, UNSAFE_DataRouterContext, useLocation } from 'react-router';

const noopUnsubscribe = () => {};

/**
 * The location a navigation is heading to, ahead of `useLocation()`.
 *
 * `RouterProvider` commits each navigation inside `startTransition`, so `useLocation()` keeps the
 * old location until the new page has rendered. Highlighting the active row from it lags behind
 * the click for as long as the page takes to render (a long Channel feed: hundreds of ms). The
 * data router's own state moves synchronously, so reading it paints the highlight right away.
 * Outside a data router it falls back to the committed location.
 */
export const useLatestLocation = (): Location => {
  const committed = useLocation();
  const router = useContext(UNSAFE_DataRouterContext)?.router;
  const subscribe = useCallback(
    (onChange: () => void) => (router ? router.subscribe(() => onChange()) : noopUnsubscribe),
    [router],
  );

  return useSyncExternalStore(subscribe, () => router?.state.location ?? committed);
};
