import { defineReplica } from '@/libs/replica';

import type { InternalLinkReference } from '../internalLink';
import type { PreviewData } from './previewData';

export type PreviewableReference = Exclude<InternalLinkReference, { type: 'route' }>;

export interface EntityPreviewParams {
  /** The preview's meta lines are localized. */
  locale: string;
  reference: PreviewableReference;
}

/** One entry per entity, whichever link or hover card asked first. */
export const entityPreviewKey = ({ reference }: EntityPreviewParams) =>
  `${reference.type}|${reference.pathname}`;

/** Longest description kept; the card clamps it to three lines. */
export const MAX_PREVIEW_DESCRIPTION = 500;

/**
 * The hover card of an in-app entity link, also read eagerly for a bare link's
 * title. Persisted per workspace, so a reloaded conversation paints resolved
 * titles instead of raw URLs. `null` = the entity was not found.
 */
export const entityPreviewResource = defineReplica<EntityPreviewParams, PreviewData | null>({
  key: entityPreviewKey,
  name: 'entityLinkPreview',
  persist: { maxEntries: 200 },
  query: ({ locale }) => locale,
  storage: 'indexedDB',
  version: 1,
});
