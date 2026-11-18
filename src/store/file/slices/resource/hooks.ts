import { revalidateReplica } from '@/libs/replica';
import { type ResourceQueryParams } from '@/types/resource';

import { useFileStore } from '../../store';
import { resourceListResource } from './projection';

/** Parent identifiers for one folder: its id, its slug, or `null` for the root. */
export type ResourceParentKey = string | null;

/**
 * The workspace and library a move was issued from. Captured *before* the
 * request (`prepareResourceMoveCachePatch` on the file store): the user may
 * switch workspace or library while it is in flight, and the rows to reconcile
 * belong to the scope that listed them, not the newly active one.
 */
export interface ResourceMoveCacheScope {
  /** Library the explorer was showing, `undefined` outside a library. */
  libraryId: string | undefined;
  /** Replica partition (`user:workspace`) the move was issued under. */
  replicaScope: string;
  workspaceId: string | null;
}

export interface ResourceMoveCachePatch {
  /** Every key the source folder may be addressed by in `queryParams.parentId`. */
  fromParentKeys: ResourceParentKey[];
  scope: ResourceMoveCacheScope;
  /** Every key the destination folder may be addressed by in `queryParams.parentId`. */
  toParentKeys: ResourceParentKey[];
}

/**
 * Revalidate resources with current or specific query params.
 * This can be called from outside React components (e.g., store actions).
 */
export const revalidateResources = async (params?: ResourceQueryParams) => {
  const queryParams = params || useFileStore.getState().queryParams;
  if (!queryParams) return;

  await revalidateReplica(resourceListResource);
};
