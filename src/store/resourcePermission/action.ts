import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import type { ResourceCollaborator, ResourceGeneralAccess } from '@/services/resourcePermission';
import { resourcePermissionService } from '@/services/resourcePermission';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';
import { isTrpcErrorCode } from '@/utils/trpcError';

import {
  initialState,
  type ResourceAccessCheck,
  type ResourcePermissionState,
} from './initialState';
import {
  resourceAccessResource,
  resourceCollaboratorsResource,
  type ResourceRef,
} from './projection';
import { accessSessionKey } from './selectors';
import { useResourcePermissionStore } from './store';

const n = setNamespace('resourcePermission');

type Setter = StoreSetter<ResourcePermissionState>;

/**
 * Failures that are the server's answer rather than a transport fault: the
 * resource went private, left the workspace, or the caller lost access.
 */
const isAccessDenialError = (error: unknown): boolean =>
  isTrpcErrorCode(error, 'NOT_FOUND') ||
  isTrpcErrorCode(error, 'FORBIDDEN') ||
  isTrpcErrorCode(error, 'UNAUTHORIZED');

class ResourcePermissionActionImpl {
  readonly #access;
  readonly #collaborators;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ResourcePermissionState) {
    this.#set = set;

    this.#access = createReplicaSlice(resourceAccessResource, {
      actionPrefix: 'resourceAccess',
      effects: {
        // Every server answer, unchanged ones included, re-confirms the record
        // for this session — that is what management checks wait for.
        onApplied: (_data, _params, { key, scope }) => this.#markAccess(scope, key, 'confirmed'),
        onError: (error, _params, { key, scope }) => {
          if (key === undefined || !isAccessDenialError(error)) return;
          // The persisted grant no longer holds: drop it so neither this view
          // nor a reload acts on it, and fail every check closed.
          this.#markAccess(scope, key, 'denied');
          void this.#access.remove(key, scope);
        },
      },
      fetcher: ({ resourceId, resourceType }) =>
        resourcePermissionService.getGeneralAccess(resourceType, resourceId),
      get,
      set,
      stateKey: 'accessReplica',
      view: recordLens<ResourcePermissionState, ResourceGeneralAccess>('accessMap'),
    });

    this.#collaborators = createReplicaSlice(resourceCollaboratorsResource, {
      actionPrefix: 'resourceCollaborators',
      effects: {
        onError: (error, _params, { key, scope }) => {
          // Only managers may list grants; a caller who lost that must not
          // keep (or reload) the list they saw before.
          if (key !== undefined && isAccessDenialError(error)) {
            void this.#collaborators.remove(key, scope);
          }
        },
      },
      fetcher: ({ resourceId, resourceType }) =>
        resourcePermissionService.listCollaborators(resourceType, resourceId),
      get,
      set,
      stateKey: 'collaboratorsReplica',
      view: recordLens<ResourcePermissionState, ResourceCollaborator[]>('collaboratorsMap'),
    });
  }

  #markAccess = (scope: string, key: string, check: ResourceAccessCheck): void => {
    this.#set(
      (s) => ({
        accessSessionMap: { ...s.accessSessionMap, [accessSessionKey(scope, key)]: check },
      }),
      false,
      n('markAccess', { check, key }),
    );
  };

  useFetchAccess = (ref: ResourceRef | null): ReplicaSyncResult => this.#access.useSync(ref);

  reset = (): void => {
    // `clear()` advances each replica's clear generation, so a read still in
    // flight from the previous data context (e.g. a Desktop server switch that
    // resolves to the same scope string) is discarded instead of repopulating
    // the maps and re-confirming a manage grant. It also drops this scope's
    // persisted access rows, which that context wrote.
    void this.#access.clear();
    void this.#collaborators.clear();
    this.#set(initialState, false, n('reset'));
  };
}

const { getState, setState } = useResourcePermissionStore;

export const resourcePermissionActions = new ResourcePermissionActionImpl(setState, getState);
