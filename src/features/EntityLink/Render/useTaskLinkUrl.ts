import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { buildWorkspaceAwarePath } from '@/features/Workspace/workspaceAwarePath';
import { useAppOrigin } from '@/hooks/useAppOrigin';

import type { InternalLinkReference } from '../internalLink';

/**
 * Absolute web URL of a task link, for copying it to share elsewhere.
 * `undefined` for other entities, and without an origin: a relative path
 * (or a desktop `app://renderer` one) means nothing once pasted outside.
 */
export const useTaskLinkUrl = (reference: InternalLinkReference): string | undefined => {
  const appOrigin = useAppOrigin();
  const activeWorkspaceSlug = useActiveWorkspaceSlug();

  if (reference.type !== 'task' || !appOrigin) return;

  // A workspace-prefixed path is already scoped; an unprefixed one is scoped
  // to the active workspace, the same way a click on the link resolves it.
  const pathname = reference.workspaceSlug
    ? reference.pathname
    : buildWorkspaceAwarePath(reference.pathname, activeWorkspaceSlug);

  return `${appOrigin}${pathname}`;
};
