import i18next from 'i18next';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import {
  createReplicaSlice,
  createReplicaState,
  recordLens,
  type ReplicaState,
  type ReplicaSyncResult,
} from '@/libs/replica';

import { getPreviewData, type PreviewData } from './previewData';
import {
  entityPreviewKey,
  type EntityPreviewParams,
  entityPreviewResource,
  MAX_PREVIEW_DESCRIPTION,
} from './projection';

export type { PreviewData } from './previewData';
export type { EntityPreviewParams, PreviewableReference } from './projection';

interface EntityPreviewState {
  previewMap: Record<string, PreviewData | null>;
  previewReplica: ReplicaState<PreviewData | null>;
}

export const useEntityPreviewStore = createWithEqualityFn<EntityPreviewState>()(
  () => ({ previewMap: {}, previewReplica: createReplicaState() }),
  shallow,
);

/** Only what the card renders: an agent answers with its whole config. */
const toPreview = (data: PreviewData | null): PreviewData | null =>
  data && {
    avatar: data.avatar,
    backgroundColor: data.backgroundColor,
    description: data.description?.slice(0, MAX_PREVIEW_DESCRIPTION),
    meta: data.meta,
    secondaryMeta: data.secondaryMeta,
    title: data.title,
  };

const previewSlice = createReplicaSlice(entityPreviewResource, {
  actionPrefix: 'entityLinkPreview',
  fetcher: async ({ locale, reference }) =>
    toPreview(await getPreviewData(reference, i18next.getFixedT(locale, 'chat'))),
  get: useEntityPreviewStore.getState,
  set: useEntityPreviewStore.setState,
  stateKey: 'previewReplica',
  view: recordLens<EntityPreviewState, PreviewData | null>('previewMap'),
});

export const entityPreviewSelectors = {
  /** `undefined` while unloaded, `null` when the entity was not found. */
  preview: (params: EntityPreviewParams | null) => (s: EntityPreviewState) =>
    params ? s.previewMap[entityPreviewKey(params)] : undefined,
};

export const useFetchEntityPreview = (params: EntityPreviewParams | null): ReplicaSyncResult =>
  previewSlice.useSync(params, { revalidateOnFocus: false });
