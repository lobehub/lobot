/**
 * Below this window width the list column and the content no longer fit side by side, so the
 * window shows one of them at a time, like a phone IM app: the list on a tab's root page, the
 * conversation (with a back button) on any page inside it.
 */
export const COMPACT_LAYOUT_BREAKPOINT = 720;

export const COMPACT_LAYOUT_MEDIA_QUERY = `(max-width: ${COMPACT_LAYOUT_BREAKPOINT - 1}px)`;

/** Path segments below the active workspace slug, if the pathname carries one. */
const scopedSegments = (pathname: string, activeWorkspaceSlug: string | null) => {
  const segments = pathname.split(/[#?]/)[0].split('/').filter(Boolean);
  return activeWorkspaceSlug && segments[0] === activeWorkspaceSlug ? segments.slice(1) : segments;
};

/** Tab roots whose own page is the list column itself: Messages, Contacts and Settings. */
const LIST_ROOTS = new Set(['agents', 'channels', 'settings']);

/** Whether the compact window shows the list column (a tab root) rather than the content. */
export const isCompactListRoute = (
  pathname: string,
  activeWorkspaceSlug: string | null,
): boolean => {
  const segments = scopedSegments(pathname, activeWorkspaceSlug);
  if (segments.length === 0) return true;
  return segments.length === 1 && LIST_ROOTS.has(segments[0]);
};

/**
 * Where the compact back button leads from a content page: the list it was opened from. Pages
 * that draw their own back button (Channel settings, Settings sub-pages) get none.
 */
export const compactBackTarget = (
  pathname: string,
  activeWorkspaceSlug: string | null,
): string | null => {
  const [root, ...rest] = scopedSegments(pathname, activeWorkspaceSlug);
  if (!root || rest.length === 0) return null;

  switch (root) {
    case 'agents': {
      return '/agents';
    }
    case 'channels': {
      return rest.length === 1 ? '/' : null;
    }
    case 'settings': {
      return rest.length === 1 ? '/settings' : null;
    }
    default: {
      return null;
    }
  }
};
