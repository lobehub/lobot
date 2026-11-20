import isEqual from 'fast-deep-equal';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface FallbackList<T> {
  value: T;
  workspaceId: string | null;
}

interface Snapshot<T> {
  sectioned: boolean;
  value: T;
}

/**
 * The last list each workspace actually painted. Switching clears the in-memory
 * caches before their saved rows are read back, and the "already hydrated" flag
 * stays true, so the cleared frame would otherwise paint an empty list.
 */
const snapshots = new Map<string | null, Snapshot<unknown>>();

/** A workspace whose saved list had real sections, so a return visit waits for them. */
export const workspaceListWasSectioned = (workspaceId: string | null): boolean =>
  snapshots.get(workspaceId)?.sectioned ?? false;

export const resetWorkspaceListMemory = () => {
  snapshots.clear();
};

/** How long a workspace switch may keep a stand-in list before giving up. */
const HOLD_MS = 400;

/**
 * The list to paint. A workspace already visited keeps its own last list until
 * its rows are back. A first visit keeps whatever is on screen. `givenUp`
 * releases the hold when the saved rows never arrive.
 */
export const heldWorkspaceList = <T>(
  remembered: T | undefined,
  fallback: FallbackList<T> | null,
  workspaceId: string | null,
  ready: boolean,
  givenUp: boolean,
  value: T,
): T => {
  if (ready || givenUp) return value;
  if (remembered !== undefined) return remembered;
  if (fallback && fallback.workspaceId !== workspaceId) return fallback.value;
  return value;
};

export const useHeldWorkspaceList = <T>(
  workspaceId: string | null,
  ready: boolean,
  value: T,
  sectioned = false,
): T => {
  const fallback = useRef<FallbackList<T> | null>(null);
  const seen = useRef<string | null | undefined>(undefined);
  const [release, setRelease] = useState<{ id: string | null } | null>(null);
  // The first render of a workspace still has the previous rows. The clear
  // lands in a layout effect, so that render must not be stored or painted.
  const switched = seen.current !== undefined && seen.current !== workspaceId;
  seen.current = workspaceId;
  const settled = !switched && ready;
  const givenUp = release !== null && release.id === workspaceId;
  const remembered = snapshots.get(workspaceId)?.value as T | undefined;

  let shown = heldWorkspaceList(remembered, fallback.current, workspaceId, settled, givenUp, value);
  if (settled) {
    const saved = snapshots.get(workspaceId) as Snapshot<T> | undefined;
    // Same rows come back as new objects after the cache is read. Keep the
    // painted ones so the pinned tiles do not unmount and resize.
    const next = saved && isEqual(saved.value, value) ? saved.value : value;
    const nextSectioned = (saved?.sectioned ?? false) || sectioned;
    if (!saved || saved.value !== next || saved.sectioned !== nextSectioned)
      snapshots.set(workspaceId, { sectioned: nextSectioned, value: next });
    fallback.current = { value: next, workspaceId };
    shown = next;
  }

  const [, bump] = useState(0);
  // Re-read after the cache clear. Without this, a workspace whose rows are
  // already in memory would stay on the stand-in.
  useLayoutEffect(() => {
    if (!switched) return;
    bump((n) => n + 1);
  }, [switched]);

  useEffect(() => {
    if (settled) return;
    const timer = window.setTimeout(() => setRelease({ id: workspaceId }), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [settled, workspaceId]);

  return shown;
};
