import { afterEach, describe, expect, it, vi } from 'vitest';

import * as activeWorkspaceSlugModule from '@/business/client/hooks/useActiveWorkspaceSlug';

import { openContactsFromUrl, useContactsPopupStore } from './contactsPopupStore';

const resetStore = () =>
  useContactsPopupStore.setState({
    listCollapsed: false,
    open: false,
    preview: { kind: 'home' },
    segment: null,
  });

describe('openContactsFromUrl', () => {
  afterEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  it('opens the popup on the contact a contacts path names', () => {
    vi.spyOn(activeWorkspaceSlugModule, 'getActiveWorkspaceSlug').mockReturnValue(null);

    expect(openContactsFromUrl('/agents/agt_1')).toBe(true);
    expect(useContactsPopupStore.getState()).toMatchObject({
      open: true,
      preview: { id: 'agt_1', kind: 'agent' },
    });

    openContactsFromUrl('/agents/people/u_1');
    expect(useContactsPopupStore.getState().preview).toEqual({ kind: 'person', userId: 'u_1' });

    openContactsFromUrl('/agents/shared/my%20helper');
    expect(useContactsPopupStore.getState().preview).toEqual({
      kind: 'shared',
      share: 'my helper',
    });
  });

  it('opens the agent list, on the private tab when the path asks for it', () => {
    vi.spyOn(activeWorkspaceSlugModule, 'getActiveWorkspaceSlug').mockReturnValue('acme');

    expect(openContactsFromUrl('/acme/agents?tab=private')).toBe(true);
    expect(useContactsPopupStore.getState()).toMatchObject({
      open: true,
      preview: { kind: 'home' },
      segment: 'private',
    });

    openContactsFromUrl('/agents');
    expect(useContactsPopupStore.getState().segment).toBeNull();
  });

  it('ignores paths that are not the contacts page', () => {
    vi.spyOn(activeWorkspaceSlugModule, 'getActiveWorkspaceSlug').mockReturnValue('acme');

    expect(openContactsFromUrl('/channels/chn_1')).toBe(false);
    expect(openContactsFromUrl('/agent/agt_1/profile')).toBe(false);
    expect(openContactsFromUrl('agents')).toBe(false);
    expect(useContactsPopupStore.getState().open).toBe(false);
  });

  it('folds the contact list only when the caller asks, and a fresh open shows it again', () => {
    vi.spyOn(activeWorkspaceSlugModule, 'getActiveWorkspaceSlug').mockReturnValue(null);

    openContactsFromUrl('/agents/agt_1', { listCollapsed: true });
    expect(useContactsPopupStore.getState()).toMatchObject({
      listCollapsed: true,
      open: true,
      preview: { id: 'agt_1', kind: 'agent' },
    });

    useContactsPopupStore.getState().closeContacts();
    openContactsFromUrl('/agents/agt_1');
    expect(useContactsPopupStore.getState()).toMatchObject({ listCollapsed: false, open: true });
  });

  it('keeps what the person folded when another contact opens in the open popup', () => {
    vi.spyOn(activeWorkspaceSlugModule, 'getActiveWorkspaceSlug').mockReturnValue(null);

    openContactsFromUrl('/agents/agt_1');
    useContactsPopupStore.getState().setListCollapsed(true);
    openContactsFromUrl('/agents/agt_2');

    expect(useContactsPopupStore.getState()).toMatchObject({
      listCollapsed: true,
      preview: { id: 'agt_2', kind: 'agent' },
    });
  });
});
