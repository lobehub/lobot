/**
 * @vitest-environment happy-dom
 *
 * The knowledge-base list and the by-id projection are replicas: they paint
 * from the persisted copy on the first frame, the network only confirms, and a
 * rename or delete reaches every loaded copy at once.
 */
import { randomUUID } from 'node:crypto';

import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';

import { useKnowledgeBaseStore } from '../../store';
import { initialKnowledgeBaseState } from './initialState';
import { knowledgeBaseItemResource, knowledgeBaseListResource } from './projection';

const mocks = vi.hoisted(() => ({
  activeWorkspaceId: null as string | null,
  forgetLibrary: vi.fn(),
}));

vi.mock('@/store/tree', () => ({
  useTreeStore: { getState: () => ({ forgetLibrary: mocks.forgetLibrary }) },
}));

vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  getActiveWorkspaceId: () => mocks.activeWorkspaceId,
  useActiveWorkspaceId: () => mocks.activeWorkspaceId,
}));

vi.mock('@/services/knowledgeBase', () => ({
  knowledgeBaseService: {
    createKnowledgeBase: vi.fn(),
    deleteKnowledgeBase: vi.fn(),
    getKnowledgeBaseById: vi.fn(),
    getKnowledgeBaseList: vi.fn(),
    publishKnowledgeBaseToWorkspace: vi.fn(),
    setKnowledgeBaseVisibility: vi.fn(),
    updateKnowledgeBaseList: vi.fn(),
  },
}));

const LIST_ALL_STORAGE_KEY = knowledgeBaseListResource.storageKey({ visibility: undefined });
const LIST_PRIVATE_STORAGE_KEY = knowledgeBaseListResource.storageKey({ visibility: 'private' });
const listStorageKeys = [LIST_ALL_STORAGE_KEY, LIST_PRIVATE_STORAGE_KEY, 'public'];
const itemStorageKeys = ['kb-1', 'kb-9', 'p1', 'kb-gone'];

describe('knowledgeBase crud replicas', () => {
  const scopes = new Set<string>();
  let scope = '';
  const useScope = (next: string) => {
    scope = next;
    scopes.add(next);
    vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
  };

  beforeEach(() => {
    mocks.activeWorkspaceId = null;
    useScope(`kb-user-${randomUUID()}:personal`);
    act(() => useKnowledgeBaseStore.setState(initialKnowledgeBaseState));
  });

  afterEach(async () => {
    await Promise.all(
      [...scopes].flatMap((scope) => [
        ...listStorageKeys.map((queryKey) =>
          knowledgeBaseListResource.storage!.remove({ queryKey, scope }),
        ),
        ...itemStorageKeys.map((queryKey) =>
          knowledgeBaseItemResource.storage!.remove({ queryKey, scope }),
        ),
      ]),
    );
    scopes.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('mutations', () => {
    it('toggles the row loading flag', () => {
      act(() => useKnowledgeBaseStore.getState().internal_toggleKnowledgeBaseLoading('p1', true));
      expect(useKnowledgeBaseStore.getState().knowledgeBaseLoadingIds).toContain('p1');

      act(() => useKnowledgeBaseStore.getState().internal_toggleKnowledgeBaseLoading('p1', false));
      expect(useKnowledgeBaseStore.getState().knowledgeBaseLoadingIds).not.toContain('p1');
    });
  });
});
