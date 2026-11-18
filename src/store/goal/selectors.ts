import type { GoalStore } from './action';

const goalGraph = (goalId?: string | null) => (s: GoalStore) =>
  goalId ? s.goalGraphById[goalId] : undefined;

const topicGoals = (topicId?: string | null) => (s: GoalStore) =>
  topicId ? s.topicGoalsByTopicId[topicId]?.goals : undefined;

/**
 * Whether the topic's goal rows came from the server in this session. A row
 * restored from storage carries the status of whenever it was persisted, so a
 * live surface must not present it as the goal's current state until then.
 */
const topicGoalsConfirmed = (topicId?: string | null) => (s: GoalStore) =>
  !!topicId && s.topicGoalsReplica.entries[topicId]?.source === 'server';

export const goalSelectors = {
  goalGraph,
  topicGoals,
  topicGoalsConfirmed,
};
