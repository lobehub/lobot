import debug from 'debug';

import type { lambdaClient } from '@/libs/trpc/client';

const log = debug('lobe-client:topic-preview');

export const TOPIC_PREVIEW_TTL_MS = 60_000;
export const TOPIC_PREVIEW_MAX_ENTRIES = 50;

type TopicPreviewItem = Awaited<
  ReturnType<typeof lambdaClient.message.getTopicPreviews.query>
>[number];

export type TopicPreview = Extract<TopicPreviewItem, { status: 'ok' }>;

interface CacheEntry {
  fetchedAt: number;
  preview: TopicPreview;
}

const previews = new Map<string, CacheEntry>();
// Skipped and failed answers are not cached as previews, but asking again within
// the TTL would only repeat the same server read.
const attempts = new Map<string, number>();
let generation = 0;
const invalidatedAt = new Map<string, number>();

const isFresh = (entry: CacheEntry) => Date.now() - entry.fetchedAt <= TOPIC_PREVIEW_TTL_MS;

const toTime = (value: Date | string | number) => new Date(value).getTime();

export const getValidTopicPreview = (
  topicId: string,
  topic: { running?: boolean; topicUpdatedAt?: Date | string | number | null },
): TopicPreview | undefined => {
  const entry = previews.get(topicId);
  if (!entry) return undefined;

  const valid =
    isFresh(entry) &&
    !topic.running &&
    topic.topicUpdatedAt != null &&
    toTime(topic.topicUpdatedAt) === toTime(entry.preview.topicUpdatedAt);
  if (valid) return entry.preview;

  previews.delete(topicId);
  return undefined;
};

export const invalidateTopicPreview = (topicId: string): void => {
  invalidatedAt.set(topicId, ++generation);
  previews.delete(topicId);
  attempts.delete(topicId);
};
