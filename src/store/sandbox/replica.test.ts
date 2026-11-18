/**
 * @vitest-environment happy-dom
 *
 * The cloud-sandbox entitlement, the composer picker's environment and
 * instance lists and a bound instance's directory are `local-replica`
 * resources: a cold start paints the persisted answer while the network
 * confirms it, only slim projections reach storage, the instance list is one
 * row however many conversations ask, and scopes stay isolated.
 */
import { randomUUID } from 'node:crypto';

import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren, useEffect } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { setScopedMutate } from '@/libs/swr/mutate';
import { sandboxStorageService } from '@/services/sandboxStorage';

import { sandboxActions } from './action';
import { initialState } from './initialState';
import {
  SANDBOX_SCOPE_ENTRY,
  sandboxEntitlementResource,
  sandboxEnvironmentsResource,
  sandboxInstanceDirectoryResource,
  sandboxInstancesResource,
} from './projection';
import { sandboxSelectors } from './selectors';
import { useSandboxStore } from './store';

const MutateBridge = () => {
  const { mutate } = useSWRConfig();
  useEffect(() => setScopedMutate(mutate), [mutate]);
  return null;
};
const wrapper = ({ children }: PropsWithChildren) =>
  createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, provider: () => new Map() } },
    createElement(MutateBridge),
    children,
  );

/** Never-resolving fetch: what the store holds can only have come from storage. */
const pending = () => new Promise<never>(() => {});

const state = () => useSandboxStore.getState();

describe('sandbox replicas', () => {
  const scopes = new Set<string>();
  let scope = '';

  const useScope = (next: string) => {
    scope = next;
    scopes.add(next);
    vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
  };

  const resources = [
    sandboxEntitlementResource,
    sandboxEnvironmentsResource,
    sandboxInstancesResource,
    sandboxInstanceDirectoryResource,
  ] as const;

  beforeEach(() => {
    useScope(`sandbox-user-${randomUUID()}:ws-1`);
    useSandboxStore.setState({ ...initialState });
  });

  afterEach(async () => {
    cleanup();
    await Promise.all(
      [...scopes].flatMap((value) =>
        resources.flatMap((resource) =>
          [SANDBOX_SCOPE_ENTRY, 'inst-1', 'inst-gone'].map((queryKey) =>
            resource.storage!.remove({ queryKey, scope: value }),
          ),
        ),
      ),
    );
    scopes.clear();
    vi.restoreAllMocks();
  });

  it('drops the previous workspace’s entitlement on a scope switch', async () => {
    const getEntitlement = vi
      .spyOn(sandboxStorageService, 'getEntitlement')
      .mockResolvedValue({ entitled: true, quotaBytes: 1024 });
    const { rerender } = renderHook(() => sandboxActions.useFetchEntitlement(true), { wrapper });
    await waitFor(() => expect(sandboxSelectors.entitlement(state())?.entitled).toBe(true));

    useScope(`${scope.split(':')[0]}:ws-2`);
    getEntitlement.mockImplementation(pending);
    rerender();

    expect(sandboxSelectors.entitlement(state())).toBeUndefined();
  });

  it('resets with the other user-data stores', () => {
    useSandboxStore.setState({
      sandboxEntitlementMap: { [SANDBOX_SCOPE_ENTRY]: { entitled: true, quotaBytes: null } },
    });

    sandboxActions.reset();

    expect(sandboxSelectors.entitlement(state())).toBeUndefined();
  });
});
