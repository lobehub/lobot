import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { getActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { type ContactPreview, parseContactPreview } from '@/features/ContactList/previewContext';

import { useSettingsPopupStore } from './settingsPopupStore';

export interface OpenContactsOptions {
  /** Start with the contact list folded, e.g. when one contact's card asked for its profile. */
  listCollapsed?: boolean;
}

export interface ContactsPopupState {
  closeContacts: () => void;
  /** The contact list on the left is folded away, leaving the page alone. */
  listCollapsed: boolean;
  open: boolean;
  /**
   * Opens the popup. A home target clears the agent-list tab; other targets keep it.
   * The contact list shows unless `listCollapsed` asks to start with the page alone.
   */
  openContacts: (
    preview?: ContactPreview,
    segment?: 'private' | null,
    options?: OpenContactsOptions,
  ) => void;
  preview: ContactPreview;
  /** The agent-list tab when the popup shows its home. `null` is the workspace tab. */
  segment: 'private' | null;
  setListCollapsed: (collapsed: boolean) => void;
  setPreview: (preview: ContactPreview) => void;
  setSegment: (segment: 'private' | null) => void;
}

const samePreview = (a: ContactPreview, b: ContactPreview) => {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'agent': {
      return b.kind === 'agent' && a.id === b.id;
    }
    case 'person': {
      return b.kind === 'person' && a.userId === b.userId;
    }
    case 'shared': {
      return b.kind === 'shared' && a.share === b.share;
    }
    default: {
      return true;
    }
  }
};

const homeSegment = (input: string): 'private' | null => {
  const hashIndex = input.indexOf('#');
  const queryIndex = input.indexOf('?');
  if (queryIndex < 0) return null;
  const end = hashIndex > queryIndex ? hashIndex : undefined;
  return new URLSearchParams(input.slice(queryIndex + 1, end)).get('tab') === 'private'
    ? 'private'
    : null;
};

/**
 * A contacts path (`/agents`, `/agents/:id`, a person, or a shared Agent)
 * opens the popup instead of the full-screen page. Workspace-prefixed paths
 * count. Anything else, including a relative path, returns false.
 */
export const openContactsFromUrl = (input: string, options?: OpenContactsOptions): boolean => {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return false;

  const preview = parseContactPreview(trimmed, getActiveWorkspaceSlug());
  if (!preview) return false;

  useContactsPopupStore
    .getState()
    .openContacts(preview, preview.kind === 'home' ? homeSegment(trimmed) : undefined, options);
  return true;
};

export const useContactsPopupStore = createWithEqualityFn<ContactsPopupState>()(
  (set, get) => ({
    closeContacts: () => set({ open: false }),
    listCollapsed: false,
    open: false,
    openContacts: (preview = { kind: 'home' }, segment, options) => {
      useSettingsPopupStore.getState().closeSettings();
      const current = get();
      const nextSegment =
        segment !== undefined ? segment : preview.kind === 'home' ? null : current.segment;
      // An already open popup keeps whatever the person folded; a fresh one starts as asked.
      const listCollapsed = current.open
        ? (options?.listCollapsed ?? current.listCollapsed)
        : !!options?.listCollapsed;
      if (
        current.open &&
        samePreview(current.preview, preview) &&
        current.segment === nextSegment &&
        current.listCollapsed === listCollapsed
      )
        return;
      set({ listCollapsed, open: true, preview, segment: nextSegment });
    },
    preview: { kind: 'home' },
    segment: null,
    setListCollapsed: (listCollapsed) => {
      if (get().listCollapsed === listCollapsed) return;
      set({ listCollapsed });
    },
    setPreview: (preview) => {
      if (samePreview(get().preview, preview)) return;
      set({ preview });
    },
    setSegment: (segment) => {
      if (get().segment === segment) return;
      set({ segment });
    },
  }),
  shallow,
);
