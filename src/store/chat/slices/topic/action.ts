// Note: To make the code more logic and readable, we just disable the auto sort key eslint rule
// DON'T REMOVE THE FIRST LINE
import { TRACING_SCENARIOS } from '@lobechat/const';
import {
  chainSummaryTitle,
  TOPIC_TITLE_JSON_SCHEMA,
  TOPIC_TITLE_PROMPT_VERSION,
} from '@lobechat/prompts';
import { toast } from '@lobehub/ui';
import {
  type AiModelReasoningConfig,
  type ChatTopicMetadata,
  type HeterogeneousReasoningEffort,
  type HeterogeneousSpeedMode,
  type MessageMapScope,
  RequestTrigger,
  type UIChatMessage,
  type UpdateTopicMetadataInput,
} from '@lobot/types';
import isEqual from 'fast-deep-equal';
import { t } from 'i18next';
import useSWR from 'swr';
import { type SWRResponse } from 'swr';

import { LOADING_FLAT } from '@/const/message';
import {
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaPageResult,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { subscribeCacheScope } from '@/libs/replica/cacheScopeEvents';
import { mutate } from '@/libs/swr';
import { cronKeys, topicKeys } from '@/libs/swr/keys';
import { getCacheScope } from '@/libs/swr/useCacheScope';
import { aiChatService } from '@/services/aiChat';
import { type GitLinkedPRSummary } from '@/services/git';
import { messageService } from '@/services/message';
import type { TopicBatchDeleteScope } from '@/services/topic';
import { topicService } from '@/services/topic';
import { type ChatStore } from '@/store/chat';
import { snapshotAgentModel, snapshotAgentReasoning } from '@/store/chat/utils/snapshotAgentModel';
import { topicMapKey, type TopicMapScope } from '@/store/chat/utils/topicMapKey';
import {
  isAudioOnlyFirstUserMessage,
  normalizeTopicTitleMessages,
} from '@/store/chat/utils/topicTitle';
import {
  canReadTopicGitTransport,
  getTopicLinkedPullRequestBase,
  isSuccessfulLinkedPullRequestLookup,
  mergeWorkingDirGithubState,
  resolveTopicGitTransport,
  toWorkingDirGithubState,
} from '@/store/chat/utils/topicWorkingDirGit';
import { useGlobalStore } from '@/store/global';
import { getHomeStoreState } from '@/store/home';
import { type StoreSetter } from '@/store/types';
import { useUserStore } from '@/store/user';
import {
  systemAgentSelectors,
  userGeneralSettingsSelectors,
  userProfileSelectors,
} from '@/store/user/selectors';
import { type ChatTopic, type ChatTopicStatus, type CreateTopicParams } from '@/types/topic';
import { setNamespace } from '@/utils/storeDebug';

import { displayMessageSelectors } from '../message/selectors';
import { type PendingNewTopicDirectory, type TopicData } from './initialState';
import { type PendingTopicStatusSource, PendingTopicStatusWrites } from './pendingStatusWrites';
import {
  applyTopicDispatchToBucket,
  normalizeTopicListParams,
  type TopicAgentViewParams,
  topicAgentViewResource,
  type TopicListParams,
  topicListResource,
  topicListViewFields,
} from './projection';
import { type ChatTopicDispatch } from './reducer';
import { topicSelectors } from './selectors';
import { createTopicDetailSlice, RUN_WATCH_INTERVAL } from './topicDetail';
import {
  type TopicLinkedPullRequestRefreshParams,
  useTopicLinkedPullRequestSync,
} from './topicLinkedPullRequest';

const n = setNamespace('t');

const STALE_RUNNING_TOPIC_TIMEOUT = 2 * 60 * 60 * 1000;
const STALE_RUNNING_TOPIC_QUERY_PAGE_SIZE = 500;

/**
 * Max message prefetches fired per topic-list fetch for freshly-unread topics.
 * Bounds the fan-out after a long-offline boot; see
 * `#prefetchUnreadTopicMessages`.
 */
const UNREAD_TOPIC_PREFETCH_LIMIT = 5;

/**
 * Entity patch shared by every topic resource: merge, and bump `updatedAt`
 * only on a real change (same reference otherwise, so nothing re-renders).
 */
const patchTopic =
  (value: Partial<ChatTopic>) =>
  (topic: ChatTopic): ChatTopic => {
    const merged = { ...topic, ...value };
    // TODO: updatedAt type needs to be changed to Date later
    return isEqual(topic, merged) ? topic : ({ ...merged, updatedAt: new Date() } as any);
  };

type CronTopicsGroupWithJobInfo = {
  cronJob: unknown;
  cronJobId: string;
  topics: ChatTopic[];
};

type RunningTopicForWatchdog = Omit<ChatTopic, 'updatedAt'> & {
  agentId?: string | null;
  groupId?: string | null;
  updatedAt: Date | number | string;
};

type TopicPatchScope = {
  agentId?: string;
  groupId?: string;
  scope?: TopicMapScope;
};

/**
 * Options for switchTopic action
 */
interface SwitchTopicOptions {
  /**
   * Clear the _new key data even when switching to an existing topic
   * This is useful when creating a new topic, where the _new key data should be cleared
   * @default false
   */
  clearNewKey?: boolean;
  /**
   * The conversation whose `_new` bucket the cleanup should target. Send
   * flows pass the conversation the send started from: when the navigation
   * guard drops the switch, the user may be viewing a different agent/group,
   * and cleaning up by current view would wipe that view's blank bucket
   * instead of the send's own. Omit to clean by the current view (legacy).
   */
  clearNewKeyContext?: {
    agentId: string;
    groupId?: string | null;
    scope?: MessageMapScope;
  };
  /**
   * Only apply the switch while the active agent still matches. Send flows
   * pin the agent they started from: the topic guard cannot tell two blank
   * views apart (both have `activeTopicId === null`), so without this a send
   * from agent A's blank view would adopt its minted topic while the user is
   * on agent B's blank view. Omit the option to skip the check.
   */
  onlyIfActiveAgentId?: string | null;
  /**
   * Only apply the switch while the active group still matches — the
   * group-scope counterpart of `onlyIfActiveAgentId`.
   */
  onlyIfActiveGroupId?: string | null;
  /**
   * Only apply the switch while the user is still on one of these conversation
   * buckets. Send flows pass every bucket their conversation can currently live
   * under — the client-minted topic id before the server confirms it, the
   * persisted id after the re-key — so a continuation whose await the user
   * navigated away from skips the switch instead of yanking the UI (and the
   * URL) back to the sent topic. Include `null` to allow the blank
   * new-conversation view. Omit the option to always apply the switch.
   */
  onlyIfActiveTopicIn?: ReadonlyArray<string | null>;
  /**
   * Explicit scope for clearing new key data
   * If not provided, will be inferred from store state (activeGroupId)
   */
  scope?: MessageMapScope;
  /**
   * Skip refreshing messages after switching topic
   * @default false
   */
  skipRefreshMessage?: boolean;
}

interface RemoveUnstarredTopicOptions {
  /** Restrict the bulk delete to topics created by the signed-in user. */
  onlyOwn?: boolean;
}

type Setter = StoreSetter<ChatStore>;

export class ChatTopicActionImpl {
  readonly #get: () => ChatStore;
  readonly #set: Setter;

  // Monotonic token for switchTopic. Each call increments it and captures a
  // local copy; after awaited work, a mismatch means a newer switch has
  // started and our continuation is stale — drop it rather than let it
  // clobber the newer topic (see ).
  #switchTopicEpoch = 0;

  #summarizingTopicTitleIds = new Set<string>();

  /**
   * Three local-first resources over the same entity, each owning ONE store
   * location (selectors keep reading those maps):
   * - `#topicList`: sidebar pages → `topicDataMap[containerKey]`
   * - `#topicAgentView`: management page (`withDetails`, larger pages) →
   *   `agentTopicsViewMap[containerKey]`
   * - `#topicDetail`: by-id fallback → `topicDetailMap[topicId]`
   * `#topicEntity` fans a topic-level change (patch / delete / optimistic
   * write) out to whichever of them currently hold that topic.
   */
  readonly #topicList;
  readonly #topicAgentView;
  readonly #topicDetail;
  readonly #topicEntity;

  constructor(set: Setter, get: () => ChatStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
    // In-flight first-send rows: kept across refetches, never persisted.
    const isClientOnly = (topic: ChatTopic) => get().creatingTopicIds.includes(topic.id);
    // The page-size expansion flag is transient UI state.
    const toPersisted = ({ isExpandingPageSize: _expanding, ...data }: TopicData) => data;

    this.#topicList = createReplicaSlice(topicListResource, {
      actionPrefix: n('topicList'),
      fetcher: this.#fetchTopicListPage,
      get,
      isClientOnly,
      set,
      stateKey: 'topicListReplica',
      toPersisted,
      view: recordLens<ChatStore, TopicData>('topicDataMap'),
      viewFields: topicListViewFields,
    });
    this.#topicAgentView = createReplicaSlice(topicAgentViewResource, {
      actionPrefix: n('topicAgentView'),
      fetcher: this.#fetchAgentViewPage,
      get,
      isClientOnly,
      set,
      stateKey: 'agentTopicsViewReplica',
      toPersisted,
      view: recordLens<ChatStore, TopicData>('agentTopicsViewMap'),
      viewFields: ({ withDetails }) => ({ withDetails }),
    });
    this.#topicDetail = createTopicDetailSlice({
      get,
      onRunningOperation: (fresh) =>
        this.#topicEntity.update(fresh.id, (topic) => ({
          ...topic,
          metadata: { ...topic.metadata, runningOperation: fresh.metadata!.runningOperation },
        })),
      set,
    });
    this.#topicEntity = linkReplicaEntity<ChatTopic>([
      this.#topicList,
      this.#topicAgentView,
      this.#topicDetail,
    ]);
    subscribeCacheScope((scope) => this.#topicList.ensureScope(scope));
  }

  /**
   * Stage (or clear) the project working directory the next topic creation
   * binds to.
   *
   * `+` on a project group opens a blank conversation *without* creating a row;
   * this records which directory that blank conversation belongs to, and
   * `internal_createTopic` applies it when the first message creates the topic.
   * Without it the deferred row would be born with only a path — outside the
   * project list, the sidebar's project grouping and its execution routing.
   */
  setPendingNewTopicDirectory = (value?: PendingNewTopicDirectory): void => {
    this.#set({ pendingNewTopicDirectory: value }, false, n('setPendingNewTopicDirectory'));
  };

  openNewTopicOrSaveTopic = async (): Promise<void> => {
    const { switchTopic, saveToTopic, refreshMessages, activeTopicId } = this.#get();
    // An explicit new topic supersedes whatever a group "+" staged — the user
    // asked for a plain conversation, not one inside that project directory.
    this.#get().setPendingNewTopicDirectory();
    const hasTopic = !!activeTopicId;

    if (hasTopic) switchTopic(null);
    else {
      // A send from the new-topic view may still be in flight (the `_new`
      // context holds only optimistic tmp_* messages while the run itself
      // creates the real topic). Saving here would archive those tmp ids into
      // a spurious "Default Topic" and race the in-flight topic creation,
      // leaving the real topic's loading state stuck until reload. Skip:
      // the running send owns topic creation. Entry buttons are disabled via
      // the same selector, so this guard only backstops hotkey/command paths.
      if (topicSelectors.isNewTopicSendInFlight(this.#get())) return;

      await saveToTopic();
      refreshMessages();
    }
  };

  saveToTopic = async (sessionId?: string): Promise<string | undefined> => {
    // if there is no message, stop
    const messages = displayMessageSelectors.activeDisplayMessages(this.#get());
    if (messages.length === 0) return;

    const { activeAgentId, summaryTopicTitle, internal_createTopic } = this.#get();
    const targetSessionId = sessionId || activeAgentId;

    // 1. create topic and bind these messages
    const modelSnapshot = snapshotAgentModel(targetSessionId);
    const reasoningSnapshot = await snapshotAgentReasoning(targetSessionId, modelSnapshot);
    const topicId = await internal_createTopic({
      ...modelSnapshot,
      ...(reasoningSnapshot ? { metadata: reasoningSnapshot } : {}),
      title: t('defaultTitle', { ns: 'topic' }),
      messages: messages.map((m) => m.id),
      sessionId: targetSessionId,
    });

    // 2. auto summary topic Title — fire-and-forget; the title streams into the
    // row as it generates, no separate loading affordance needed.
    void summaryTopicTitle(topicId, messages).catch((error) => {
      console.error('[saveToTopic] Failed to summarize topic title:', error);
    });

    return topicId;
  };

  /**
   * Fork the active topic from one of its messages: copy the conversation
   * prefix (first message → `messageId`) into a separate new topic, then switch
   * to it. The source topic keeps its full history untouched.
   */
  forkTopic = async (messageId: string): Promise<string | undefined> => {
    const { activeTopicId, refreshTopic, switchTopic } = this.#get();
    if (!activeTopicId) return;

    const topic = topicSelectors.getTopicById(activeTopicId)(this.#get());

    const loadingToast = toast.loading(t('forkLoading', { ns: 'topic' }));

    try {
      const newTopicId = await topicService.forkTopic({
        id: activeTopicId,
        messageId,
        newTitle: t('forkTitle', { ns: 'topic', title: topic?.title ?? '' }),
      });

      await refreshTopic();
      await switchTopic(newTopicId);
      toast.success(t('forkSuccess', { ns: 'topic' }));

      return newTopicId;
    } catch (error) {
      console.error('[forkTopic] Failed to fork topic:', error);
      toast.error(t('forkFailed', { ns: 'topic' }));
    } finally {
      loadingToast.close();
    }
  };

  summaryTopicTitle = async (topicId: string, messages: UIChatMessage[]): Promise<void> => {
    const { internal_updateTopicTitleInSummary } = this.#get();
    const topic =
      topicSelectors.getTopicById(topicId)(this.#get()) ??
      (await topicService.getTopicDetail(topicId));
    if (!topic) return;

    const messagesForTitle = normalizeTopicTitleMessages(messages);

    // A voice-only first message has no text until the assistant responds. Do not
    // replace the visible default title with a loading placeholder for an empty
    // summary request; the run lifecycle retries with the completed reply.
    const hasTextContent = messagesForTitle.some((message) => {
      const content = message.content?.trim();
      return !!content && !(message.role === 'assistant' && content === LOADING_FLAT);
    });
    if (!hasTextContent && isAudioOnlyFirstUserMessage(messagesForTitle)) return;
    if (this.#summarizingTopicTitleIds.has(topicId)) return;

    this.#summarizingTopicTitleIds.add(topicId);

    // Keep an optimistic title like "阅读下面..." stable while AI rename runs;
    // otherwise the sidebar flickers `title -> ... -> final title`.
    const shouldShowPlaceholder = !topic.title || topic.title === LOADING_FLAT;

    if (shouldShowPlaceholder) internal_updateTopicTitleInSummary(topicId, LOADING_FLAT);

    const restorePreviousTitle = () => {
      if (shouldShowPlaceholder) internal_updateTopicTitleInSummary(topicId, topic.title);
    };

    // Get current agent for topic
    const { model, provider } = systemAgentSelectors.topic(useUserStore.getState());

    // Structured generation, the same way `SystemAgentService.generateTopicTitle`
    // does it: the chain asks for `TOPIC_TITLE_JSON_SCHEMA`, so read the title
    // off the parsed object. Streaming a completion here used to write the raw
    // answer to `topic.title`, which named topics `{"title":"简单问候"}`.
    try {
      const { data } = await aiChatService.generateJSON(
        {
          ...chainSummaryTitle(
            messagesForTitle,
            userGeneralSettingsSelectors.currentResponseLanguage(useUserStore.getState()),
          ),
          metadata: { topicId, trigger: RequestTrigger.TopicTitle },
          model,
          provider,
          schema: TOPIC_TITLE_JSON_SCHEMA,
          tracing: {
            promptVersion: TOPIC_TITLE_PROMPT_VERSION,
            scenario: TRACING_SCENARIOS.TopicTitle,
            schemaName: TOPIC_TITLE_JSON_SCHEMA.name,
            topicId,
          },
        },
        new AbortController(),
      );

      const title = (data as { title?: string } | undefined)?.title?.trim();
      // An empty result must not blank the title — the placeholder would
      // otherwise stay in the sidebar forever.
      if (!title) return restorePreviousTitle();

      await this.#get().internal_updateTopic(topicId, { title });
    } catch (error) {
      console.error('[summaryTopicTitle] failed to generate a title:', error);
      restorePreviousTitle();
    } finally {
      this.#summarizingTopicTitleIds.delete(topicId);
    }
  };

  updateTopicMetadata = async (
    id: string,
    metadata: UpdateTopicMetadataInput & Pick<ChatTopicMetadata, 'onboardingSession'>,
  ): Promise<void> => {
    const topic = topicSelectors.getTopicById(id)(this.#get());
    if (!topic) {
      await topicService.updateTopicMetadata(id, metadata);
      await this.#get()
        .refreshTopic()
        .catch(() => undefined);
      return;
    }

    // Optimistic update with merged metadata
    const mergedMetadata = { ...topic.metadata, ...metadata };
    this.#get().internal_dispatchTopic({
      type: 'updateTopic',
      id,
      value: { metadata: mergedMetadata },
    });

    try {
      await topicService.updateTopicMetadata(id, metadata);
    } catch (error) {
      this.#get().internal_dispatchTopic({
        type: 'updateTopic',
        id,
        value: { metadata: topic.metadata },
      });
      throw error;
    }
    await this.#get()
      .refreshTopic()
      .catch(() => undefined);
  };

  updateTopicTitle = async (id: string, title: string): Promise<void> => {
    await this.#get().internal_updateTopic(id, { title });
  };

  /**
   * Model + pin land in one server write (`topic.updateTopicModel`) so a run or
   * a concurrent switch can never see the new model with the old model's pin.
   * Optimistically mirrors the server merge: `reasoningConfig` is replaced,
   * `heteroEffort` and `heteroSpeed` only when given.
   */
  #writeTopicModelPin = async (
    id: string,
    value: {
      metadata?: Pick<ChatTopicMetadata, 'heteroEffort' | 'heteroSpeed' | 'reasoningConfig'>;
      model: string;
      provider: string;
    },
  ): Promise<void> => {
    const { activeAgentId, activeGroupId } = this.#get();
    const containerKey =
      topicSelectors.getTopicContainerKeyById(id)(this.#get()) ??
      topicMapKey({ agentId: activeAgentId, groupId: activeGroupId });
    const previous = topicSelectors.getTopicById(id)(this.#get());
    const { reasoningConfig: _stale, ...rest } = previous?.metadata ?? {};
    this.#get().internal_dispatchTopic({
      containerKey,
      id,
      type: 'updateTopic',
      value: {
        metadata: { ...rest, ...value.metadata },
        model: value.model,
        provider: value.provider,
      },
    });

    try {
      await topicService.updateTopicModel(id, value);
    } catch (error) {
      if (previous) {
        this.#get().internal_dispatchTopic({
          containerKey,
          id,
          type: 'updateTopic',
          value: {
            model: previous.model,
            provider: previous.provider,
            metadata: previous.metadata,
          },
        });
      }
      await this.#recoverTopicPinWrite(containerKey, error);
    }
    await this.#get().refreshTopic(containerKey);
  };

  /**
   * Apply a heterogeneous (Claude Code / Codex) model, effort and speed
   * selection to one topic. When the selector pairs a model switch with an
   * effort or speed reset (the new model does not support it) everything lands
   * in the same write, so the topic never carries a model with a pin it cannot run.
   */
  updateTopicHeteroPin = async (
    id: string,
    {
      effort,
      model,
      provider,
      speed,
    }: {
      effort?: HeterogeneousReasoningEffort;
      model?: string;
      provider: string;
      speed?: HeterogeneousSpeedMode;
    },
  ): Promise<void> => {
    const metadata: Pick<ChatTopicMetadata, 'heteroEffort' | 'heteroSpeed'> = {
      ...(effort === undefined ? {} : { heteroEffort: effort }),
      ...(speed === undefined ? {} : { heteroSpeed: speed }),
    };
    const hasMetadata = Object.keys(metadata).length > 0;
    if (model === undefined && !hasMetadata) return;

    /** Model resets and later effort/speed selections must share one persistence order. */
    await this.#enqueueTopicEffortWrite(id, () =>
      model === undefined
        ? this.#writeTopicEffortPin(id, metadata)
        : this.#writeTopicModelPin(id, {
            metadata: hasMetadata ? metadata : undefined,
            model,
            provider,
          }),
    );
  };

  #topicEffortWrites = new Map<string, Promise<void>>();

  /** Serialize the full optimistic write/RPC/refresh cycle so earlier selections cannot land last. */
  #enqueueTopicEffortWrite = async (id: string, write: () => Promise<void>): Promise<void> => {
    const previous = this.#topicEffortWrites.get(id);
    /** Failures already revalidate and toast; a rejected write must not poison the next selection. */
    const pending = (previous ? previous.catch(() => {}) : Promise.resolve()).then(write);
    this.#topicEffortWrites.set(id, pending);
    this.#set(
      (s) => ({
        topicEffortUpdatingIds: s.topicEffortUpdatingIds.includes(id)
          ? s.topicEffortUpdatingIds
          : [...s.topicEffortUpdatingIds, id],
      }),
      false,
      n('topicEffort/start'),
    );
    try {
      await pending;
    } finally {
      if (this.#topicEffortWrites.get(id) === pending) {
        this.#topicEffortWrites.delete(id);
        this.#set(
          (s) => ({ topicEffortUpdatingIds: s.topicEffortUpdatingIds.filter((key) => key !== id) }),
          false,
          n('topicEffort/end'),
        );
      }
    }
  };

  /**
   * `updateTopicMetadata` shows the new value optimistically and has no
   * rollback, so a failed effort write would leave the picker (and client-side
   * generation) on a value that was never persisted. Revalidate and tell the
   * user, mirroring `updateModelReasoningConfig` for the user-level default.
   */
  #writeTopicEffortPin = async (
    id: string,
    metadata: Pick<ChatTopicMetadata, 'heteroEffort' | 'heteroSpeed' | 'reasoningConfig'>,
  ): Promise<void> => {
    const { activeAgentId, activeGroupId } = this.#get();
    const containerKey =
      topicSelectors.getTopicContainerKeyById(id)(this.#get()) ??
      topicMapKey({ agentId: activeAgentId, groupId: activeGroupId });
    const previous = topicSelectors.getTopicById(id)(this.#get());
    if (!previous) return;
    this.#get().internal_dispatchTopic({
      containerKey,
      id,
      type: 'updateTopic',
      value: { metadata: { ...previous.metadata, ...metadata } },
    });
    try {
      await topicService.updateTopicMetadata(id, metadata);
    } catch (error) {
      if (previous) {
        this.#get().internal_dispatchTopic({
          containerKey,
          id,
          type: 'updateTopic',
          value: { metadata: previous.metadata },
        });
      }
      await this.#recoverTopicPinWrite(containerKey, error);
    }
    await this.#get().refreshTopic(containerKey);
  };

  /** Local rollback must survive an offline refresh and preserve the original write failure. */
  #recoverTopicPinWrite = async (
    containerKey: string | undefined,
    error: unknown,
  ): Promise<never> => {
    toast.error(t('reasoningEffort.updateFailed', { ns: 'chat' }));
    try {
      await this.#get().refreshTopic(containerKey);
    } catch (refreshError) {
      console.error('[topicPin] Failed to revalidate after rollback:', refreshError);
    }
    throw error;
  };

  /** Optimistic status writes a refetch must not clobber — see {@link PendingTopicStatusWrites}. */
  #pendingTopicStatusWrites = new PendingTopicStatusWrites();

  #reconcileFetchedTopics = (
    items: ChatTopic[],
    currentItems: ChatTopic[] | undefined,
    source: PendingTopicStatusSource,
  ): ChatTopic[] => {
    let next = this.#pendingTopicStatusWrites.applyAll(items, source);

    // In-flight first-send optimistic rows are client-only, so any refetch
    // landing mid-send (e.g. the fire-and-forget refreshTopic after a previous
    // run's topic creation or terminal) would wipe them from the sidebar until
    // the server confirms the topic. Re-prepend the ones still in the bucket —
    // they only ever leave it via replaceTopicId (send resolved) or deleteTopic
    // (rollback), never via a fetch.
    //
    // Membership comes from `creatingTopicIds`, not from the id string: the
    // placeholder carries a real `tpc_…` id the server is asked to honour, so
    // it is indistinguishable from a persisted one — and a prefix test would
    // fail silently the next time the id format changes.
    const creatingTopicIds = this.#get().creatingTopicIds;
    if (currentItems && currentItems.length > 0 && creatingTopicIds.length > 0) {
      const optimisticRows = currentItems.filter((item) => creatingTopicIds.includes(item.id));
      if (optimisticRows.length > 0) {
        const fetchedIds = new Set(next.map((item) => item.id));
        const surviving = optimisticRows.filter((item) => !fetchedIds.has(item.id));
        if (surviving.length > 0) next = [...surviving, ...next];
      }
    }

    return next;
  };

  /**
   * Warm the message cache for topics whose status just flipped to `unread` in
   * a fetched topic list — i.e. runs that completed remotely / on another
   * device / while the app was closed. Their local message bucket typically
   * holds only the creation-time seed (the first user message), so without a
   * prefetch the first click renders that partial list until the switch-time
   * revalidation lands.
   *
   * Store-level on purpose: the sidebar item's own unread-prefetch effect only
   * fires while that item is MOUNTED, which misses collapsed groups and rows
   * outside the virtualized viewport. Locally-run topics don't need this path —
   * streaming already filled their bucket, and `prefetchMessages`' running
   * guard skips them while the terminal bookkeeping is still in flight.
   *
   * Capped so a boot after days offline doesn't fan out a request storm; the
   * uncapped remainder still self-heals on click via the switch revalidation.
   * `prefetchMessages` itself dedupes concurrent calls and skips
   * server-verified or running contexts, so repeated onData fires are cheap.
   */
  #prefetchUnreadTopicMessages = (
    fetchedTopics: ChatTopic[],
    previousItems: ChatTopic[] | undefined,
    context: { agentId?: string | null; groupId?: string | null },
  ): void => {
    // Message buckets for group scopes key on more than agentId/topicId; the
    // canonical message:list prefetch only represents plain agent topics.
    if (!context.agentId || context.groupId) return;

    const previousStatus = new Map(previousItems?.map((item) => [item.id, item.status]) ?? []);
    // First load (no previous items) sweeps every unread topic — those runs
    // finished while the app was closed and nothing else will warm them.
    const flipped = fetchedTopics.filter(
      (item) => item.status === 'unread' && previousStatus.get(item.id) !== 'unread',
    );

    for (const topic of flipped.slice(0, UNREAD_TOPIC_PREFETCH_LIMIT)) {
      void this.#get().prefetchMessages({
        agentId: context.agentId,
        scope: 'main',
        topicId: topic.id,
      });
    }
  };

  /**
   * Persist the topic's status. Optimistically patches the in-memory map so the
   * sidebar reflects it at once; persistence is fire-and-forget so a network
   * blip never tears down the agent run that owns the write.
   *
   * Pass `agentId`/`groupId` when the call originates from an agent run rather
   * than the active UI — without them, the lookup falls back to the currently
   * active agent, and a write arriving after the user switched agents lands in
   * the wrong bucket. The DB write is unconditional so even if no bucket is
   * loaded for this topic, the next refetch picks up the persisted status.
   */
  updateTopicStatus = async (params: {
    agentId?: string;
    /** Write even when the local row already reads `status`; the server's may differ. */
    force?: boolean;
    groupId?: string;
    scope?: TopicMapScope;
    status: ChatTopicStatus;
    topicId: string;
  }): Promise<void> => {
    const { agentId, force, groupId, scope, status, topicId } = params;
    const state = this.#get();
    const scopedAgentId = scope ? agentId : (agentId ?? state.activeAgentId);
    const scopedGroupId = scope ? groupId : (groupId ?? state.activeGroupId);
    const key = topicMapKey({
      agentId: scopedAgentId,
      groupId: scopedGroupId,
      scope,
    });
    const topic = state.topicDataMap[key]?.items?.find((t) => t.id === topicId);

    // Already at the target status — both the in-memory and DB writes are no-ops.
    if (!force && topic?.status === status) return;

    this.internal_pinTopicStatus(params);

    // "Archive" in the UI writes status:'completed'. Stamp `completedAt` on that
    // transition so bulk/stale archive records when the topic was completed,
    // matching the single-item `markTopicCompleted`. Other status transitions
    // (agent runs → running/active/unread/…) leave `completedAt` untouched.
    const patch: Partial<ChatTopic> =
      status === 'completed' ? { completedAt: new Date(), status } : { status };

    await topicService.updateTopic(topicId, patch).catch((err) => {
      console.error('[updateTopicStatus] persist failed:', err);
      // The DB never got the write — stop pinning it over fetched rows.
      this.#pendingTopicStatusWrites.drop(topicId);
    });
  };

  /**
   * Local-only half of {@link updateTopicStatus}: registers the optimistic
   * pending-write pin and dispatches the in-memory patch, without persisting
   * to the server.
   *
   * For completion paths that already have their own ownership-guarded
   * server write (e.g. the gateway transport's `settleRunningOperation`,
   * compared under a row lock by operation id) and only need to mirror the
   * outcome locally — calling `updateTopicStatus` there would add a second,
   * unguarded `topicService.updateTopic` write that could stomp a newer run's
   * status. Skipping the pin entirely instead (a bare `internal_dispatchTopic`)
   * is also wrong: a topic-list refetch racing in behind this write has no
   * signal that a fresher status just landed, and `#reconcileFetchedTopics`
   * would happily reapply the older pending write (e.g. the 'running' pin set
   * when the run started) right back over it, stranding the sidebar spinner
   * again until that pin expires.
   */
  internal_pinTopicStatus = (params: {
    agentId?: string;
    groupId?: string;
    scope?: TopicMapScope;
    status: ChatTopicStatus;
    topicId: string;
  }): void => {
    const { topicId, status, agentId, groupId, scope } = params;
    const state = this.#get();
    const scopedAgentId = scope ? agentId : (agentId ?? state.activeAgentId);
    const scopedGroupId = scope ? groupId : (groupId ?? state.activeGroupId);
    const key = topicMapKey({
      agentId: scopedAgentId,
      groupId: scopedGroupId,
      scope,
    });
    const topic = state.topicDataMap[key]?.items?.find((t) => t.id === topicId);

    if (topic?.status === status) return;

    const patch: Partial<ChatTopic> =
      status === 'completed' ? { completedAt: new Date(), status } : { status };

    this.#pendingTopicStatusWrites.pin(topicId, status);

    // Scope on the payload routes the write to the owning bucket inside
    // `internal_dispatchTopic`. A no-op if the bucket isn't loaded; the pin
    // above still ensures the status sticks across the next refetch.
    state.internal_dispatchTopic({
      type: 'updateTopic',
      id: topicId,
      value: patch,
      agentId,
      groupId,
      scope,
    });
  };

  /**
   * Local mirror of a server-confirmed `unread → active` clear (`markTopicRead`).
   * Unlike {@link internal_pinTopicStatus} it never pins: the clear's response
   * may already be stale when it lands (a run started meanwhile, here or on
   * another device), so a newer pending write wins and the next fetch stays
   * authoritative. Only loaded copies that are still unread follow — every one
   * of them, since the sidebar's unread dot reads all loaded buckets.
   *
   * `status` is the server's current status when the clear found the row
   * already moved on; it defaults to the `active` the clear itself wrote.
   */
  internal_settleTopicRead = (params: { status?: ChatTopicStatus; topicId: string }) => {
    const { status = 'active', topicId } = params;
    if (!this.#pendingTopicStatusWrites.settle(topicId, 'unread')) return;

    this.#topicEntity.update(topicId, (topic) =>
      topic.status === 'unread' ? { ...topic, status } : topic,
    );
  };

  /**
   * One sidebar page (`cursor` = page index, `undefined` = head). The head
   * page also drives the page-size-expansion flag and the unread prefetch.
   */
  #fetchTopicListPage = async (
    { agentId, groupId, pageSize, ...query }: TopicListParams,
    cursor?: number,
  ): Promise<ReplicaPageResult<ChatTopic, number>> => {
    const containerKey = topicMapKey({ agentId, groupId });
    const isHead = cursor === undefined;
    const currentData = this.#get().topicDataMap[containerKey];
    const lastPageSize = currentData?.pageSize;

    // Only treat as "expanding page size" when user actually increases pageSize,
    // not when SWR revalidates or when total items < pageSize.
    const isExpanding =
      isHead &&
      (currentData?.items?.length || 0) > 0 &&
      typeof lastPageSize === 'number' &&
      pageSize > lastPageSize;
    if (isExpanding)
      this.#get().internal_updateTopicData(containerKey, { isExpandingPageSize: true });

    try {
      const result = await topicService.getTopics({
        agentId,
        current: cursor ?? 0,
        groupId,
        pageSize,
        ...query,
      });
      const items = this.#pendingTopicStatusWrites.applyAll(result.items, 'server');
      if (isHead)
        this.#prefetchUnreadTopicMessages(items, this.#get().topicDataMap[containerKey]?.items, {
          agentId,
          groupId,
        });
      return { items, total: result.total };
    } finally {
      if (isExpanding)
        this.#get().internal_updateTopicData(containerKey, { isExpandingPageSize: false });
    }
  };

  #fetchAgentViewPage = async (
    { agentId, pageSize, withDetails }: TopicAgentViewParams,
    cursor?: number,
  ): Promise<ReplicaPageResult<ChatTopic, number>> => {
    const result = await topicService.getTopics({
      agentId,
      current: cursor ?? 0,
      pageSize,
      withDetails,
    });
    return {
      items: this.#pendingTopicStatusWrites.applyAll(result.items, 'server'),
      total: result.total,
    };
  };

  /** By-id details and background run discovery. An absent id disables the read. */
  useFetchTopicDetail = (topicId?: string | null, watchRuns = false): ReplicaSyncResult =>
    this.#topicDetail.useSync(topicId || null, {
      dedupingInterval: 1000,
      focusThrottleInterval: 5000,
      refreshInterval: watchRuns ? RUN_WATCH_INTERVAL : 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
    });

  switchTopic = async (id?: string | null, options?: SwitchTopicOptions): Promise<void> => {
    const opts = options ?? {};

    const { activeAgentId, activeGroupId } = this.#get();

    // Clear the _new key data in the following cases:
    // 1. When id is null or undefined (switching to empty topic state)
    // 2. When clearNewKey option is explicitly true
    // This prevents stale data from previous conversations showing up
    // Note: Use == null to match both null and undefined
    //
    // Housekeeping runs BEFORE the navigation guard below: a send whose
    // continuation is dropped because the user navigated away is still done
    // with the blank conversation it came from — the cleanup targets that
    // origin bucket (opts.clearNewKeyContext), never the view the user moved
    // to. In the normal (unguarded) case origin and current view are the same
    // conversation, so this is identical to cleaning up after the guard.
    const shouldClearNewKey = !id || opts.clearNewKey;

    if (shouldClearNewKey) {
      this.#get().clearPortalStack();
    }

    const cleanupAgentId = opts.clearNewKeyContext?.agentId ?? activeAgentId;
    const cleanupGroupId = opts.clearNewKeyContext?.groupId ?? activeGroupId;

    if (shouldClearNewKey && cleanupAgentId) {
      // Determine scope: use explicit scope, or infer from the cleanup group
      const scope =
        opts.clearNewKeyContext?.scope ?? opts.scope ?? (cleanupGroupId ? 'group' : 'main');

      this.#get().replaceMessages([], {
        context: {
          agentId: cleanupAgentId,
          groupId: cleanupGroupId,
          scope,
          topicId: null,
        },
        action: n('clearNewKeyData'),
      });
    }

    // Send-flow continuation guard: if the caller requires the user to still
    // be on a specific conversation and they've navigated elsewhere while the
    // send's awaits were in flight, drop the switch instead of yanking the UI
    // (and the URL, via ChatHydration's route sync) back to the sent topic.
    // The topic id alone cannot tell two blank views apart — a null origin and
    // a null destination look identical — so send flows also pin the agent and
    // group they started from. The epoch token below cannot catch any of this
    // — the user's switch happened in between, but this call is still the
    // newest one. Runs before the epoch bump: a skipped switch must not
    // invalidate a concurrent switch's pending revalidation.
    if (opts.onlyIfActiveTopicIn) {
      // `activeTopicId` uses `null` for "no topic" but is typed `string` and can
      // hold `undefined`/`''` from callers that never went through switchTopic,
      // so normalize before comparing — an unset field must still match an
      // explicit `null` expectation (the blank new-conversation view).
      const activeTopicId = this.#get().activeTopicId || null;
      if (!opts.onlyIfActiveTopicIn.includes(activeTopicId)) return;
    }
    if (
      opts.onlyIfActiveAgentId !== undefined &&
      (activeAgentId ?? null) !== opts.onlyIfActiveAgentId
    )
      return;
    if (
      opts.onlyIfActiveGroupId !== undefined &&
      (activeGroupId ?? null) !== opts.onlyIfActiveGroupId
    )
      return;

    const epoch = ++this.#switchTopicEpoch;
    // A staged project directory only describes the blank conversation it was
    // opened from; moving to a real topic ends that window. Cleared here (after
    // the guards) so a switch the guards dropped does not discard it.
    if (id) {
      this.#set({ pendingNewTopicDirectory: undefined }, false, n('clearPendingNewTopicDirectory'));
    }

    this.#set(
      { activeTopicId: id || (null as any), activeThreadId: undefined },
      false,
      n('toggleTopic'),
    );

    if (activeAgentId) {
      void this.#get().markTopicRead({ agentId: activeAgentId, topicId: id ?? null });
    }

    if (opts.skipRefreshMessage) return;

    // Yield a microtask so any switchTopic calls queued behind us can run
    // their sync bodies (and bump #switchTopicEpoch) before we commit to a
    // revalidation. On the other side of the yield, an epoch mismatch means a
    // newer switch has taken over — skip the redundant SWR mutate. Navigation
    // uses a soft ensure so a completed or in-flight sidebar prefetch is not
    // invalidated by the switch itself; explicit refresh signals still go
    // through refreshMessages and advance the request generation.
    await Promise.resolve();
    if (epoch !== this.#switchTopicEpoch) return;

    await this.#get().revalidateMessages();
  };

  removeTopic = async (id: string, removeFiles?: boolean): Promise<void> => {
    const { activeAgentId, activeGroupId, activeTopicId, switchTopic, refreshTopic } = this.#get();
    // Allow deletion when either agentId or groupId is active
    if (!activeAgentId && !activeGroupId) return;

    // remove topic (and optionally its uploaded attachments)
    await topicService.removeTopic(id, removeFiles);
    this.#get().internal_dispatchTopic({ type: 'deleteTopic', id }, 'removeTopic');
    await refreshTopic();
    // drop the deleted topic's message cache so it doesn't orphan in IndexedDB
    void this.#get().evictConversationMessages((ctx) => ctx.topicId === id);

    // switch back to default topic
    if (activeTopicId === id) switchTopic(null);
  };

  internal_updateTopicTitleInSummary = (id: string, title: string): void => {
    this.#get().internal_dispatchTopic(
      { type: 'updateTopic', id, value: { title } },
      'updateTopicTitleInSummary',
    );
  };

  /**
   * @param ownerContainerKey - Revalidate this `topicDataMap` bucket instead of
   *   the active agent/group one. Pass it whenever the affected row may live
   *   elsewhere (Agent Builder panels render another agent's conversation);
   *   omitting it refreshes whatever the page is showing.
   */
  refreshTopic = async (ownerContainerKey?: string): Promise<void> => {
    const { activeAgentId, activeGroupId } = this.#get();
    // Same container key the topic-list resource uses as its entry key.
    const containerKey =
      ownerContainerKey ?? topicMapKey({ agentId: activeAgentId, groupId: activeGroupId });
    const agentViewKey =
      ownerContainerKey ?? (activeAgentId ? topicMapKey({ agentId: activeAgentId }) : null);
    await Promise.all([
      this.#topicList.revalidate(containerKey),
      agentViewKey !== null && this.#topicAgentView.revalidate(agentViewKey),
    ]);
  };

  /** Re-read one topic's by-id detail; `fetch` also reads it when no view has it mounted. */
  refreshTopicDetail = (id: string, fetch?: boolean): Promise<unknown> =>
    fetch ? this.#topicDetail.fetch(id, { fresh: true }) : this.#topicDetail.revalidate(id);

  internal_replaceTopicId = (params: {
    agentId?: string;
    groupId?: string;
    nextId: string;
    previousId: string;
    value?: Partial<ChatTopic>;
  }): void => {
    const { agentId, groupId, nextId, previousId, value } = params;

    // The first-message optimistic topic starts as a client-only row. Once the
    // server returns the real id, keep the same row alive so title-summary
    // updates continue targeting the visible topic.
    this.#get().internal_dispatchTopic(
      {
        agentId,
        groupId,
        id: previousId,
        nextId,
        type: 'replaceTopicId',
        value,
      },
      n('replaceTopicId'),
    );

    if (previousId === nextId) return;

    this.#set(
      (state) => ({
        activeTopicId: state.activeTopicId === previousId ? nextId : state.activeTopicId,
      }),
      false,
      n('replaceTopicId/active'),
    );
  };

  internal_updateTopic = async (id: string, data: Partial<ChatTopic>): Promise<void> => {
    // The row is not necessarily in the active agent/group bucket — resolve the
    // one that holds it, so the revalidation lands where the topic is actually
    // rendered (see `getTopicContainerKeyById`).
    const { activeAgentId, activeGroupId } = this.#get();
    const containerKey =
      topicSelectors.getTopicContainerKeyById(id)(this.#get()) ??
      topicMapKey({ agentId: activeAgentId, groupId: activeGroupId });

    // One overlay per resource holding the topic (sidebar, management page,
    // detail); all commit or all roll back with the single server call.
    await this.#topicEntity.optimistic(id, patchTopic(data), () =>
      topicService.updateTopic(id, data),
    );
    await this.#get().refreshTopic(containerKey);
  };

  internal_createTopic = async (params: CreateTopicParams): Promise<string> => {
    // A blank conversation opened from a project group's "+" carries the
    // directory it belongs to — fold it into the create call so the row is born
    // inside that project. Only for the agent it was staged on: a pending
    // directory must never land on another agent's topic.
    const pending = this.#get().pendingNewTopicDirectory;
    const targetSessionId = params.sessionId ?? this.#get().activeAgentId;
    const staged = pending?.agentId === targetSessionId ? pending : undefined;
    const createParams: CreateTopicParams = staged
      ? {
          ...params,
          ...(staged.projectWorkingDirectoryId
            ? { projectWorkingDirectoryId: staged.projectWorkingDirectoryId }
            : { projectId: staged.projectId }),
        }
      : params;

    const tmpId = Date.now().toString();
    this.#get().internal_dispatchTopic(
      { type: 'addTopic', value: { ...createParams, id: tmpId } },
      'internal_createTopic',
    );

    const topicId = await topicService.createTopic(createParams);
    if (staged) this.#get().setPendingNewTopicDirectory();
    await this.#get().refreshTopic();

    return topicId;
  };

  /**
   * Apply a topic reducer to a bucket in `topicDataMap`. Scope on the payload
   * (`agentId`/`groupId`) wins; otherwise falls back to the currently active
   * agent/group bucket. Pass scope on the payload when the write originates
   * outside the active UI context — e.g. an agent run finishing after the
   * user switched agents (see `updateTopicStatus`).
   */
  internal_dispatchTopic = (payload: ChatTopicDispatch, action?: any): void => {
    // Devtools names now come from the resource bindings (`t/topicList/update` …).
    void action;
    // Track the optimistic-row lifecycle here, at the single funnel every
    // add / replace / delete goes through, so a caller cannot register a
    // placeholder and then forget to clear it.
    if (payload.type === 'addTopic' && payload.optimistic && payload.value.id) {
      const id = payload.value.id;
      if (!this.#get().creatingTopicIds.includes(id)) {
        this.#set(
          (state) => ({ creatingTopicIds: [...state.creatingTopicIds, id] }),
          false,
          n('creatingTopic/register'),
        );
      }
    } else if (
      (payload.type === 'replaceTopicId' || payload.type === 'deleteTopic') && // The row is no longer client-only: either the server confirmed it, or
      // the send rolled back and the row is gone.
      this.#get().creatingTopicIds.includes(payload.id)
    ) {
      this.#set(
        (state) => ({
          creatingTopicIds: state.creatingTopicIds.filter((creating) => creating !== payload.id),
        }),
        false,
        n('creatingTopic/release'),
      );
    }

    const { activeAgentId, activeGroupId } = this.#get();
    const scopedAgentId = payload.scope ? payload.agentId : (payload.agentId ?? activeAgentId);
    const scopedGroupId = payload.scope ? payload.groupId : (payload.groupId ?? activeGroupId);
    const key =
      payload.containerKey ??
      topicMapKey({
        agentId: scopedAgentId,
        groupId: scopedGroupId,
        scope: payload.scope,
      });

    switch (payload.type) {
      // Status / title patches and deletions are entity facts: they reach every
      // resource holding the topic and are persisted, so the next cold boot
      // never repaints them stale (e.g. a finished run's spinner).
      case 'updateTopic': {
        this.#topicEntity.update(payload.id, patchTopic(payload.value));
        return;
      }
      case 'deleteTopic': {
        this.#topicEntity.remove(payload.id);
        return;
      }
      // Adds and id swaps are list-structure placeholders until the server
      // list confirms them: memory only, in the target container.
      case 'addTopic': {
        this.#topicList.update(key, (bucket) => applyTopicDispatchToBucket(bucket, payload), {
          persist: false,
        });
        // The management page only gains the row once it has loaded that agent.
        this.#topicAgentView.update(
          key,
          (bucket) => bucket && applyTopicDispatchToBucket(bucket, payload),
          { persist: false },
        );
        return;
      }
      case 'replaceTopicId': {
        for (const slice of [this.#topicList, this.#topicAgentView])
          slice.update(key, (bucket) => applyTopicDispatchToBucket(bucket, payload), {
            persist: false,
          });
        const detail = this.#get().topicDetailMap[payload.id];
        if (detail && payload.nextId !== payload.id) {
          this.#topicDetail.remove(payload.id);
          this.#topicDetail.update(
            payload.nextId,
            () => ({ ...detail, ...payload.value, id: payload.nextId }),
            { persist: false },
          );
        }
      }
    }
  };

  internal_updateTopics = (
    agentId: string | undefined,
    params: {
      append?: boolean;
      currentPage?: number;
      groupId?: string;
      items: ChatTopic[];
      pageSize: number;
      total: number;
    },
  ): void => {
    const { total, pageSize, currentPage = 0, append = false, groupId } = params;
    const key = topicMapKey({ agentId, groupId });

    this.#topicList.update(
      key,
      (currentData) => {
        // Append mode keeps the existing items (optimistic rows included) in
        // front, so only pass them for reconciliation on full replacement.
        const items = this.#reconcileFetchedTopics(
          params.items,
          append ? undefined : currentData?.items,
          'cache',
        );
        const nextItems = append ? [...(currentData?.items || []), ...items] : items;

        return {
          currentPage,
          excludeStatuses: currentData?.excludeStatuses,
          excludeTriggers: currentData?.excludeTriggers,
          hasMore: total > nextItems.length,
          isInbox: currentData?.isInbox,
          isExpandingPageSize: false,
          isLoadingMore: false,
          items: nextItems,
          onlyMine: currentData?.onlyMine,
          pageSize,
          sortBy: currentData?.sortBy,
          total,
        };
      },
      { persist: false },
    );
  };

  internal_updateTopicData = (key: string, data: Partial<TopicData>): void => {
    this.#topicList.update(key, (currentData) => currentData && { ...currentData, ...data }, {
      persist: false,
    });
  };
}

export type ChatTopicAction = Pick<ChatTopicActionImpl, keyof ChatTopicActionImpl>;
