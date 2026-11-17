import { GOAL_GRAPH_CAPABILITY, type GoalStatus } from '@lobechat/const/goal';
import type {
  GoalCreateConfig,
  GoalGraphSnapshot,
  GoalMetricCriterion,
  GoalNodeKind,
  GoalSubscriptionFreshnessPolicy,
  GoalSubscriptionWakeCondition,
  GoalTickResult,
} from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

interface GoalListParams {
  agentId?: string;
  /** List only archived goals; omitted, archived goals are left out. */
  archived?: boolean;
  limit?: number;
  offset?: number;
  projectId?: string;
  statuses?: GoalStatus[];
  /** Goals created from this conversation. */
  topicId?: string;
}

/** Every graph method takes the `goals` row id. */
class GoalService {
  /**
   * List goals. Each item is the execution-carrier task with the goal row
   * attached plus subtree run statistics — see `GoalModel.list` on the server.
   */
  list = async (params: GoalListParams) => lambdaClient.goal.list.query(params);

  /** The whole Goal Graph in one read: nodes, edges, decisions, events, work-version links. */
  getGraph = async (id: string): Promise<GoalGraphSnapshot> => {
    // This client draws batches; without the declaration the server sends an
    // older client's shape (see `graphForClient`).
    const { data } = await lambdaClient.goal.graph.query({
      capabilities: [GOAL_GRAPH_CAPABILITY.batch],
      id,
    });
    return data;
  };
}

export const goalService = new GoalService();

type GoalListResult = Awaited<ReturnType<GoalService['list']>>;
export type GoalListItem = GoalListResult['goals'][number];
