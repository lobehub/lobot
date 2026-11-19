'use client';

import { createContext, useContext } from 'react';

export type ContactPreview =
  | { kind: 'home' }
  | { kind: 'agent'; id: string }
  | { kind: 'person'; userId: string }
  | { kind: 'shared'; share: string };

export interface ContactPreviewContextValue {
  preview: ContactPreview;
  setPreview: (preview: ContactPreview) => void;
}

export const ContactPreviewContext = createContext<ContactPreviewContextValue | null>(null);

export const useContactPreview = () => useContext(ContactPreviewContext);

/**
 * Parse a Contacts URL into a preview target. A workspace slug prefix is
 * stripped. Returns null when the path leaves Contacts.
 */
export const parseContactPreview = (
  pathname: string,
  activeWorkspaceSlug?: string | null,
): ContactPreview | null => {
  const pathOnly = pathname.split('?')[0].split('#')[0];
  const segments = pathOnly.split('/').filter(Boolean);
  const rest =
    activeWorkspaceSlug && segments[0] === activeWorkspaceSlug ? segments.slice(1) : segments;
  if (rest[0] !== 'agents') return null;
  if (rest.length === 1) return { kind: 'home' };
  if (rest[1] === 'people' && rest[2]) return { kind: 'person', userId: rest[2] };
  if (rest[1] === 'shared' && rest[2]) {
    return { kind: 'shared', share: decodeURIComponent(rest[2]) };
  }
  if (rest[1]) return { kind: 'agent', id: rest[1] };
  return { kind: 'home' };
};

export const contactPreviewPath = (preview: ContactPreview): string => {
  switch (preview.kind) {
    case 'home': {
      return '/agents';
    }
    case 'agent': {
      return `/agents/${preview.id}`;
    }
    case 'person': {
      return `/agents/people/${preview.userId}`;
    }
    case 'shared': {
      return `/agents/shared/${encodeURIComponent(preview.share)}`;
    }
  }
};
