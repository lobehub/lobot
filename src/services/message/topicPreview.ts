import type { AssistantContentBlock, UIChatMessage, WorkSummaryItem } from '@lobot/types';
import debug from 'debug';

import type {
  OperationEditedFile,
  OperationGoal,
} from '@/features/Conversation/operationArtifacts';

const log = debug('lobe-client:topic-preview');

export const TOPIC_PREVIEW_TTL_MS = 60_000;
export const TOPIC_PREVIEW_MAX_ENTRIES = 50;

export interface TopicPreviewTimelineRow {
  createdAt: Date | number | string;
  finishType?: string;
  id: string;
  updatedAt: Date | number | string;
}

/** A `message.getTopicPreviews` answer that has a preview to draw. */
export interface TopicPreview {
  blocks: AssistantContentBlock[];
  editedFiles: OperationEditedFile[];
  goals: OperationGoal[];
  kind: 'group' | 'single';
  /** The rows above the answer, sent only when this round is the whole topic. */
  leading: UIChatMessage[] | null;
  message: UIChatMessage;
  status: 'ok';
  timeline: TopicPreviewTimelineRow[];
  topicId: string;
  topicUpdatedAt: string;
  workRootOperationId: string | null;
  works: WorkSummaryItem[];
}

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
