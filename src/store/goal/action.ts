import { TRACING_SCENARIOS } from '@lobechat/const';
import {
  GOAL_ACCEPTANCE_TASK_TITLE,
  GOAL_TITLE_MAX_LENGTH,
  goalClarificationIslandKey,
  goalDecisionIslandKey,
  goalSignOffIslandKey,
  type GoalStatus,
} from '@lobechat/const/goal';
import {
  chainSummaryTitle,
  TOPIC_TITLE_JSON_SCHEMA,
  TOPIC_TITLE_PROMPT_VERSION,
} from '@lobechat/prompts';
import {
  type GoalGraphSnapshot,
  type GoalMetricCriterion,
  type GoalTickResult,
  RequestTrigger,
} from '@lobot/types';

import {
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  revalidateReplica,
} from '@/libs/replica';
import { mutate, useClientDataSWR } from '@/libs/swr';
import { goalKeys } from '@/libs/swr/keys';
import { aiChatService } from '@/services/aiChat';
import { type GoalListItem, goalService } from '@/services/goal';
import { type MetricSeriesWithPoints, metricService } from '@/services/metric';
import { userService } from '@/services/user';
import { taskGroupListResource, taskListResource } from '@/store/task/slices/list/projection';
import type { StoreSetter } from '@/store/types';
import { useUserStore } from '@/store/user';
import { systemAgentSelectors, userGeneralSettingsSelectors } from '@/store/user/selectors';
import { isTrpcErrorCode } from '@/utils/trpcError';

import { goalArchivedForFilter, goalStatusesForFilter } from './goalListFilter';
import { buildGoalTitleMessages } from './goalTitle';
import { useGoalStore } from './index';
import type { GoalListFilter, GoalState, GoalViewMode } from './initialState';
import {
  GOAL_LIST_FILTERS,
  goalGraphResource,
  goalListEntity,
  goalListKey,
  type GoalListParams,
  goalListResource,
  goalListScopeParams,
  type GoalListValue,
  goalMetricSeriesResource,
  homeGoalListResource,
  topicGoalListResource,
} from './projection';

/**
 * The goals page reads one wide page and reveals more of it client-side, so the
 * server read is a single window rather than a paged walk.
 */
const GOAL_LIST_FETCH_LIMIT = 100;

/**
 * The home roll-up only ever renders goals that are still open, so it asks for
 * the statuses one can be open in and leaves the terminal ones on the server.
 * `completed` is in because a completed goal is awaiting acceptance until the
 * user accepts it.
 *
 * The limit still bites in a workspace with more than this many such goals —
 * `groupList` takes the newest, and accepted goals stay `completed` — so the
 * tail of a very long history can crowd out an old still-running goal. Fixing
 * that for real needs an acceptance join on the server; this keeps the window
 * as wide as the query allows in the meantime.
 */
// The home roll-up only renders goals that are still open: terminal states
// (achieved / canceled) stay on the server, `review` is included because a
// converged goal is still awaiting the user's sign-off.
const HOME_GOAL_STATUSES: GoalStatus[] = ['planning', 'running', 'verifying', 'review'];
const HOME_GOAL_FETCH_LIMIT = 100;

/**
 * Statuses in which the *server* is the one making progress. A goal now
 * advances from server events, so nothing tells an open page to re-read: the
 * frontier, activity and findings would sit frozen — a spinner still turning
 * on a goal that already finished — until the tab lost and regained focus.
 *
 * `review` and `paused` are deliberately out: those wait on a person, and the
 * action that moves them refreshes the snapshot itself.
 */
const SERVER_ADVANCING_STATUSES = new Set<GoalStatus>(['planning', 'running', 'verifying']);

/**
 * Whether an open view must keep re-reading a goal in this status. A draft is
 * arranged and usually started by its agent from the conversation, never from
 * this view, so no local action would refresh its "Not started".
 */
const goalStatusPolled = (status: GoalStatus) =>
  SERVER_ADVANCING_STATUSES.has(status) || status === 'draft';

/** Kept coarse on purpose — this is liveness, not a progress bar. */
const GOAL_GRAPH_POLL_INTERVAL = 5000;
const PENDING_CLARIFICATIONS_POLL_INTERVAL = 30_000;

/**
 * Acceptance states in which the Goal's own delivery has nothing left in
 * flight. `pending`, `planned`, `repairing` and `verifying` are writes still on
 * their way from the coordinator or from the verify run it dispatched.
 *
 * `rejected` is terminal for this poll as well. Rejecting a Goal's delivery
 * either reopens the Goal — `reopenForChanges` makes it `running`, which the
 * advancing-status branch above already covers — or only records the decision
 * (`acceptance.reject` with `dispatch: false`), after which nothing else is
 * coming for that acceptance. Leaving it out polls that sticky state every five
 * seconds for as long as the page stays open.
 */
const SETTLED_ACCEPTANCE_STATUSES = new Set([
  'accepted',
  'closed',
  'delivered',
  'errored',
  'rejected',
]);

/**
 * Whether the Goal's own acceptance has a write still coming.
 *
 * A terminal Goal whose own acceptance has not settled is **mid-transition**:
 * the verdict is not written yet. Stopping the poll on that half-written
 * snapshot is what froze an open result page after a rework — the Goal already
 * read 已达成 while the sign-off strip still showed the rejected round and the
 * criteria count stayed at the rework's starting point, until the page was
 * reloaded. Keep reading until the acceptance settles; the settled snapshot is
 * the one the page can rest on.
 */
const goalAcceptanceUnsettled = (graph: GoalGraphSnapshot): boolean => {
  const terminal = graph.nodes?.find(
    (node) => node.kind === 'task' && node.title === GOAL_ACCEPTANCE_TASK_TITLE,
  );
  const acceptance = terminal ? graph.acceptances?.[terminal.id] : undefined;
  return !!acceptance && !SETTLED_ACCEPTANCE_STATUSES.has(acceptance.status);
};

/**
 * Whether an open graph still has a server-side write coming — the poll driver
 * for the graph snapshot itself.
 */
const goalGraphShouldPoll = (graph: GoalGraphSnapshot): boolean =>
  goalStatusPolled(graph.goal.status) ||
  graph.report?.status === 'running' ||
  (graph.goal.status === 'achieved' && goalAcceptanceUnsettled(graph));

/**
 * Polling is driven from the store view, not from SWR's function-form
 * `refreshInterval`: a replica's sync hook is a plain number, and the goal
 * graph lands in the view after the first response, which re-renders this
 * subscription and arms the timer.
 */
const useGoalGraphAdvancing = (goalId?: string | null): boolean =>
  useGoalStore((state) => {
    const graph = goalId ? state.goalGraphById[goalId] : undefined;
    return graph ? goalGraphShouldPoll(graph) : false;
  });

/** A conversation rarely plans more than one goal; this only bounds a runaway topic. */
const TOPIC_GOAL_FETCH_LIMIT = 20;

/**
 * The composer tray and the working sidebar both read a topic's goals on
 * mount; this window collapses them into one request. It stays under the poll
 * interval because SWR's poll ticks dedupe too.
 */
const TOPIC_GOALS_DEDUPING_INTERVAL = 4000;

const useTopicGoalsAdvancing = (topicId?: string | null): boolean =>
  useGoalStore((state) =>
    topicId
      ? (state.topicGoalsByTopicId[topicId]?.goals.some(({ goal }) =>
          goalStatusPolled(goal.status),
        ) ?? false)
      : false,
  );

export type GoalStore = GoalState & GoalAction;
type Setter = StoreSetter<GoalStore>;

export class GoalActionImpl {
  readonly #get: () => GoalStore;
  readonly #goalGraph;
  readonly #goalList;
  readonly #goalMetricSeries;
  readonly #homeGoalList;
  readonly #topicGoalList;

  constructor(set: Setter, get: () => GoalStore, _api?: unknown) {
    void _api;
    this.#get = get;

    this.#goalList = createReplicaSlice(goalListResource, {
      actionPrefix: 'goalList',
      entity: goalListEntity,
      fetcher: ({ agentId, filter, projectId }) =>
        goalService.list({
          agentId,
          archived: goalArchivedForFilter(filter),
          limit: GOAL_LIST_FETCH_LIMIT,
          projectId,
          statuses: goalStatusesForFilter(filter),
        }),
      get,
      set,
      stateKey: 'goalListReplica',
      view: recordLens<GoalStore, GoalListValue>('goalListByAgentId'),
    });

    this.#homeGoalList = createReplicaSlice(homeGoalListResource, {
      actionPrefix: 'homeGoalList',
      entity: goalListEntity,
      fetcher: () =>
        goalService.list({ limit: HOME_GOAL_FETCH_LIMIT, statuses: HOME_GOAL_STATUSES }),
      get,
      set,
      stateKey: 'homeGoalsReplica',
      view: recordLens<GoalStore, GoalListValue>('homeGoalsByScope'),
    });

    this.#topicGoalList = createReplicaSlice(topicGoalListResource, {
      actionPrefix: 'topicGoalList',
      entity: goalListEntity,
      fetcher: (topicId) => goalService.list({ limit: TOPIC_GOAL_FETCH_LIMIT, topicId }),
      get,
      set,
      stateKey: 'topicGoalsReplica',
      view: recordLens<GoalStore, GoalListValue>('topicGoalsByTopicId'),
    });

    // One goal row is rendered by a scope's tabs, the home rail and the
    // conversation that created it; a change to it has to reach every list
    // holding it, loaded or only persisted.
    linkReplicaEntity<GoalListItem>([this.#goalList, this.#homeGoalList, this.#topicGoalList]);

    this.#goalGraph = createReplicaSlice(goalGraphResource, {
      actionPrefix: 'goalGraph',
      fetcher: (goalId) => goalService.getGraph(goalId),
      get,
      set,
      stateKey: 'goalGraphReplica',
      view: recordLens<GoalStore, GoalGraphSnapshot>('goalGraphById'),
    });

    this.#goalMetricSeries = createReplicaSlice(goalMetricSeriesResource, {
      actionPrefix: 'goalMetricSeries',
      // Only the declared keys are fetched — the same goal can accumulate any
      // number of other sampled series, and none of them can affect this view.
      // Keys are read at fetch time; the declare path revalidates this cache
      // key right after refreshing the graph, so a newly declared clause is
      // fetched against fresh criteria.
      fetcher: (goalId) =>
        metricService.listSeriesWithPoints(
          'goal',
          goalId,
          (this.#get().goalGraphById[goalId]?.goal.config?.acceptance?.metrics ?? []).map(
            (criterion) => criterion.key,
          ),
        ),
      get,
      set,
      stateKey: 'goalMetricSeriesReplica',
      view: recordLens<GoalStore, MetricSeriesWithPoints[]>('goalMetricSeriesById'),
    });
  }

  /**
   * The Goal Graph snapshot behind the process-control surface. Read it through
   * `goalSelectors.goalGraph`, never from this hook — the replica owns the
   * value, the hook only orchestrates the fetch.
   */
  useFetchGoalGraph = (goalId?: string | null) => {
    const shouldPoll = useGoalGraphAdvancing(goalId);
    // Freshness while a graph is polling is the point; the first frame paints
    // the persisted snapshot, so nothing has to wait for the network.
    const sync = this.#goalGraph.useSync(goalId || null, {
      // A goal deleted by another client answers NOT_FOUND on every read, and a
      // cached snapshot is enough for the page to keep painting the gone goal —
      // and, while it still reads as advancing, to keep polling the missing
      // endpoint. NOT_FOUND is definitive, so drop the goal's cached rows (the
      // snapshot and its metric series) and let the page settle on its 404; any
      // transient failure keeps the persisted snapshot on screen.
      onError: (error) => {
        if (!goalId || !isTrpcErrorCode(error, 'NOT_FOUND')) return;
        this.#goalGraph.remove(goalId);
        this.#goalMetricSeries.remove(goalId);
      },
      refreshInterval: shouldPoll ? GOAL_GRAPH_POLL_INTERVAL : 0,
      revalidateOnFocus: true,
    });
    return { ...sync, isLoading: sync.isValidating, mutate: sync.revalidate };
  };

  /**
   * Goals created from one conversation. A goal a CLI agent creates through
   * `lh goal create --conversation` leaves no tool result to derive a card from,
   * so the conversation reads the link from the goal rows instead. Polls on the
   * graph's cadence while any of them is still advancing on the server, and
   * while a `/goal` request is generating (`generating`, decided by the caller)
   * — that run is the one that creates the goal, so nothing on screen would
   * otherwise ask for it.
   *
   * Read the rows through `goalSelectors.topicGoals`; the persisted copy paints
   * first, and `goalSelectors.topicGoalsConfirmed` says when its statuses are
   * the server's current ones.
   */
  useFetchTopicGoals = (topicId?: string | null, generating?: boolean) => {
    const advancing = useTopicGoalsAdvancing(topicId);
    return this.#topicGoalList.useSync(topicId || null, {
      dedupingInterval: TOPIC_GOALS_DEDUPING_INTERVAL,
      refreshInterval: generating || advancing ? GOAL_GRAPH_POLL_INTERVAL : 0,
      revalidateOnFocus: true,
    });
  };
}

export type GoalAction = Pick<GoalActionImpl, keyof GoalActionImpl>;
