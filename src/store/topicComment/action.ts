import type { TopicCommentItem, TopicCommentSummary } from '@lobot/types';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { topicCommentService } from '@/services/topicComment';
import type { StoreSetter } from '@/store/types';

import {
  createOptimisticTopicCommentKey,
  type OptimisticTopicComment,
  type OptimisticTopicCommentMutation,
  type OptimisticTopicCommentReplyCountMutation,
  type TopicCommentDraft,
} from './initialState';
import {
  TOPIC_COMMENT_PAGE_SIZE,
  topicCommentDetailResource,
  type TopicCommentRepliesParams,
  type TopicCommentReplyFeed,
  topicCommentReplyResource,
  topicCommentSummaryResource,
  type TopicCommentThreadFeed,
  topicCommentThreadResource,
  topicCommentThreadsKey,
  type TopicCommentThreadsParams,
} from './projection';
import type { TopicCommentStore } from './store';

type Setter = StoreSetter<TopicCommentStore>;

export const createTopicCommentSlice = (
  set: Setter,
  get: () => TopicCommentStore,
  _api?: unknown,
) => new TopicCommentActionImpl(set, get, _api);

/**
 * The workspace topic-comment domain.
 *
 * Server state is a set of four replicas (`threadFeedMap` root feeds,
 * `replyFeedMap` reply feeds, `commentSummaryMap` counts, `commentDetailMap`
 * single comments): each paints its persisted copy on the first frame and is
 * confirmed by the network in the background. The store also keeps the
 * client-only drafts and optimistic overlays the comment UI writes through.
 */
class TopicCommentActionImpl {
  readonly #detail;
  readonly #get: () => TopicCommentStore;
  readonly #replies;
  readonly #set: Setter;
  readonly #summary;
  readonly #thread;

  constructor(set: Setter, get: () => TopicCommentStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
    this.#thread = createReplicaSlice(topicCommentThreadResource, {
      actionPrefix: 'topicComment/threads',
      fetcher: (params, cursor) => this.#fetchThreads(params, cursor),
      get,
      set,
      stateKey: 'threadFeedReplica',
      view: recordLens<TopicCommentStore, TopicCommentThreadFeed>('threadFeedMap'),
    });
    this.#replies = createReplicaSlice(topicCommentReplyResource, {
      actionPrefix: 'topicComment/replies',
      fetcher: (params, cursor) => this.#fetchReplies(params, cursor),
      get,
      set,
      stateKey: 'replyFeedReplica',
      view: recordLens<TopicCommentStore, TopicCommentReplyFeed>('replyFeedMap'),
    });
    this.#summary = createReplicaSlice(topicCommentSummaryResource, {
      actionPrefix: 'topicComment/summary',
      fetcher: (topicId) => topicCommentService.summary(topicId),
      get,
      set,
      stateKey: 'commentSummaryReplica',
      view: recordLens<TopicCommentStore, TopicCommentSummary>('commentSummaryMap'),
    });
    this.#detail = createReplicaSlice(topicCommentDetailResource, {
      actionPrefix: 'topicComment/detail',
      fetcher: (commentId) => topicCommentService.get(commentId),
      get,
      set,
      stateKey: 'commentDetailReplica',
      view: recordLens<TopicCommentStore, TopicCommentItem>('commentDetailMap'),
    });
  }

  #fetchReplies = (params: TopicCommentRepliesParams, cursor?: string) =>
    topicCommentService.listReplies({
      cursor,
      limit: params.pageSize ?? TOPIC_COMMENT_PAGE_SIZE,
      rootCommentId: params.rootCommentId,
    });

  #fetchThreads = (params: TopicCommentThreadsParams, cursor?: string) =>
    topicCommentService.listThreads({
      cursor,
      limit: params.pageSize ?? TOPIC_COMMENT_PAGE_SIZE,
      messageId: params.messageId,
      topicId: params.topicId,
    });

  // ---- server reads (replica) -------------------------------------------

  /** Hydrate + sync the topic comment summary. Returns flags only; read `commentSummaryMap`. */
  useFetchTopicCommentSummary = (
    topicId: string | null | undefined,
    enabled = true,
  ): ReplicaSyncResult =>
    this.#summary.useSync(topicId ?? null, { dedupingInterval: 30_000, enabled });

  /** Hydrate + sync the root-comment feed of one topic (optionally one message). */
  useFetchTopicCommentThreads = (
    params: TopicCommentThreadsParams | null | undefined,
    enabled = true,
  ): ReplicaSyncResult => this.#thread.useSync(params ?? null, { enabled });

  /** Hydrate + sync the reply feed of one root comment. */
  useFetchTopicCommentReplies = (
    params: TopicCommentRepliesParams | null | undefined,
    enabled = true,
  ): ReplicaSyncResult => this.#replies.useSync(params ?? null, { enabled });

  /** Hydrate + sync one comment by id (used by the standalone thread header). */
  useFetchTopicCommentDetail = (
    commentId: string | null | undefined,
    enabled = true,
  ): ReplicaSyncResult => this.#detail.useSync(commentId ?? null, { enabled });

  loadMoreTopicCommentThreads = (params: TopicCommentThreadsParams) =>
    this.#thread.loadMore(topicCommentThreadsKey(params), params);

  loadMoreTopicCommentReplies = (params: TopicCommentRepliesParams) =>
    this.#replies.loadMore(params.rootCommentId, params);

  /**
   * Re-read a feed after an event or an explicit refresh. A head-only
   * revalidation keeps the already-loaded tail pages, so a change another
   * member made to an older page would survive it — drop the tail first, then
   * re-read the head; the next "load more" walks the pages below it again.
   */
  revalidateTopicCommentThreads = (params: TopicCommentThreadsParams) => {
    const key = topicCommentThreadsKey(params);
    this.#thread.collapse(key);
    return this.#thread.revalidate(key);
  };

  revalidateTopicCommentReplies = (params: TopicCommentRepliesParams) => {
    this.#replies.collapse(params.rootCommentId);
    return this.#replies.revalidate(params.rootCommentId);
  };

  revalidateTopicCommentSummary = (topicId: string) => this.#summary.revalidate(topicId);

  revalidateTopicCommentDetail = (commentId: string) => this.#detail.revalidate(commentId);

  /**
   * Patch the summary between a comment write and the revalidation that
   * follows it, so the badge never lags the list. Kept out of persistence — the
   * server value replaces it on the next sync.
   */
  applyTopicCommentSummary = (
    topicId: string,
    apply: (current: TopicCommentSummary | undefined) => TopicCommentSummary | undefined,
  ) => this.#summary.update(topicId, apply, { persist: false });

  /** Confirm a server-written comment into the by-id detail replica. */
  upsertTopicCommentDetail = (comment: TopicCommentItem) =>
    this.#detail.update(comment.id, () => comment);

  /** Drop a hard-deleted comment from the by-id detail replica (view + storage). */
  removeTopicCommentDetail = (commentId: string) => this.#detail.remove(commentId);

  // ---- client-only state (drafts + optimistic overlays) ------------------

  clearDraft = (key: string, expectedClientId?: string): void => {
    if (expectedClientId && this.#get().drafts[key]?.clientId !== expectedClientId) return;

    const { [key]: _, ...drafts } = this.#get().drafts;
    this.#set({ drafts }, false, 'clearDraft');
  };

  removeOptimisticComment = (targetKey: string, clientId: string): void => {
    const key = createOptimisticTopicCommentKey(targetKey, clientId);
    const { [key]: _, ...optimisticComments } = this.#get().optimisticComments;
    this.#set({ optimisticComments }, false, 'removeOptimisticComment');
  };

  removeOptimisticMutation = (commentId: string): void => {
    const { [commentId]: _, ...optimisticMutations } = this.#get().optimisticMutations;
    this.#set({ optimisticMutations }, false, 'removeOptimisticMutation');
  };

  removeOptimisticReplyCountMutation = (id: string): void => {
    const { [id]: _, ...optimisticReplyCountMutations } = this.#get().optimisticReplyCountMutations;
    this.#set({ optimisticReplyCountMutations }, false, 'removeOptimisticReplyCountMutation');
  };

  setDraft = (key: string, draft: TopicCommentDraft): void => {
    this.#set({ drafts: { ...this.#get().drafts, [key]: draft } }, false, 'setDraft');
  };

  setDraftContent = (
    key: string,
    content: string,
    editorData?: TopicCommentDraft['editorData'],
  ): void => {
    const current = this.#get().drafts[key];
    const clientId =
      current?.clientId && current.content.trim() === content.trim() ? current.clientId : undefined;

    this.#set(
      {
        drafts: {
          ...this.#get().drafts,
          [key]:
            editorData === undefined ? { clientId, content } : { clientId, content, editorData },
        },
      },
      false,
      'setDraftContent',
    );
  };

  upsertOptimisticComment = (comment: OptimisticTopicComment): void => {
    const key = createOptimisticTopicCommentKey(comment.targetKey, comment.comment.clientId);
    this.#set(
      {
        optimisticComments: {
          ...this.#get().optimisticComments,
          [key]: comment,
        },
      },
      false,
      'upsertOptimisticComment',
    );
  };

  upsertOptimisticMutation = (mutation: OptimisticTopicCommentMutation): void => {
    this.#set(
      {
        optimisticMutations: {
          ...this.#get().optimisticMutations,
          [mutation.comment.id]: mutation,
        },
      },
      false,
      'upsertOptimisticMutation',
    );
  };

  upsertOptimisticReplyCountMutation = (
    mutation: OptimisticTopicCommentReplyCountMutation,
  ): void => {
    this.#set(
      {
        optimisticReplyCountMutations: {
          ...this.#get().optimisticReplyCountMutations,
          [mutation.id]: mutation,
        },
      },
      false,
      'upsertOptimisticReplyCountMutation',
    );
  };
}

export type TopicCommentAction = Pick<TopicCommentActionImpl, keyof TopicCommentActionImpl>;
