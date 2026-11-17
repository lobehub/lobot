/**
 * Goal lifecycle states.
 *
 * A goal is an independent target entity: it owns its definition (title /
 * requirement), budget, and state machine. Unlike `tasks`, whose status is
 * about execution, a goal's status is about the whole acceptance loop —
 * including human review (`review`) and the terminal `achieved` outcome.
 */
export const goalStatuses = [
  // Arranged but not started: the coordinator leaves it alone until `start`.
  'draft',
  'planning',
  'running',
  'verifying',
  'review',
  'paused',
  'achieved',
  'failed',
  'canceled',
] as const;

export type GoalStatus = (typeof goalStatuses)[number];

/**
 * Longest title a person may give a goal. A title is a one-line label for the
 * list, the sidebar and the page header; the full ask lives in `requirement`.
 */
export const GOAL_TITLE_MAX_LENGTH = 255;

/**
 * The execution carrier a goal is optionally bound to. Kept polymorphic so a
 * goal does not depend on any single execution model:
 *
 * - `task`       — the current `/goal` flow: the goal runs inside a dedicated task.
 * - `topic`      — a goal declared directly in a conversation (the topic is the carrier).
 * - `standalone` — a pure goal declaration with no execution carrier attached.
 *
 * `null` means no carrier has been bound yet.
 */
export const goalSubjectTypes = ['task', 'topic', 'standalone'] as const;

/**
 * Fixed title of the terminal Goal-acceptance Work the coordinator creates
 * once every other Work is terminal. Stored in English as data; clients
 * recognize it and render the localized copy (`goalProcess.node.terminalAcceptance`).
 */
export const GOAL_ACCEPTANCE_TASK_TITLE = 'Complete full Goal acceptance';

/**
 * Fixed title of the decision node the coordinator opens when decomposition
 * finds a question only the user can answer. Stored in English as data and
 * matched by clients for localized copy, the same way as the acceptance title.
 */
export const GOAL_CLARIFICATION_TITLE = 'Clarify the goal';

/**
 * Fixed title of the decision node the coordinator opens when a machine problem
 * needs a person: the setup is broken (a missing working directory, a CLI that is
 * not installed, an unregistered device) or the automatic retries for a usage
 * limit or a transport fault are spent. Nothing about the work is in question, so
 * clients tell it apart from a judgment gate by this title, the same way as the
 * clarification gate.
 */
export const GOAL_MACHINE_GATE_TITLE = 'Fix the setup, then retry';

/**
 * Fixed title of the decision node the main Agent opens when an ordinary
 * planning turn escalates a question with its own answers. Matched by clients
 * for localized copy, like the clarification title.
 */
export const GOAL_MANAGER_QUESTION_TITLE = 'Answer the main Agent';

/** Option ids every clarification decision carries besides the planner's own choices. */
export const GOAL_CLARIFICATION_OPTION = {
  /** Answer in the free-text note; the note is the answer. */
  answer: 'answer',
  /** Proceed on the assumption the planner stated for this question. */
  assume: 'assume',
} as const;

// ============================================
// Batch rollout (STAMP) — one repeated mould, delivered as a class
// ============================================

/**
 * Rollout trigger vocabulary. Kept in sync with the `GoalRolloutTrigger` union
 * in `@lobot/types` (type-tested here), mirroring the `goalStatuses`
 * convention. `off` is explicit opt-out; an absent policy means the same thing.
 */
export const goalRolloutTriggers = ['canary', 'full', 'off'] as const;

/**
 * Fixed title of the `batch` container node that holds a repeated mould's
 * probe, gate and waves. Stored in English as data; clients recognize it for
 * localized copy, the same way as the acceptance and clarification titles.
 */
export const GOAL_BATCH_TITLE = 'Deliver the repeated batch';

/**
 * Graph features a client declares it can render, sent with the graph read.
 * The server keeps newer node kinds from clients that do not declare them —
 * a cached web bundle or an installed desktop app predates them — and returns
 * a shape they already understand instead.
 */
export const GOAL_GRAPH_CAPABILITY = {
  /** The `batch` node kind (repeated-mould rollouts). */
  batch: 'batch',
} as const;

/**
 * Fixed title of the Assay (gate) decision node inside a batch. The coordinator
 * opens it to answer one question a person may have to settle: can this whole
 * class run automatically?
 */
export const GOAL_BATCH_ASSAY_TITLE = 'Prove the batch runs automatically';

/**
 * Fixed title of the decision node a passed batch gate opens when the next wave
 * waits on a person's approval. Each hold gets its own node: a node carries one
 * decision, and the Assay keeps its own for a pattern break.
 */
export const GOAL_BATCH_RELEASE_TITLE = 'Approve releasing the next wave';

/** Fixed title of the Template (recipe) finding node a batch distills. */
export const GOAL_BATCH_TEMPLATE_TITLE = 'Batch recipe';

/**
 * The batch pattern-break gate's option ids. Shared by the server that opens the
 * gate and the client that localizes it, the same way `GOAL_CLARIFICATION_OPTION`
 * is; the human-facing labels live in the locale files, never in the payload.
 */
export const GOAL_BATCH_BREAK_OPTION = {
  newClass: 'new_class',
  revise: 'revise',
} as const;

/**
 * The release-approval gate's option ids. `revise` shares the pattern break's
 * id, but here the correction goes to the main Agent, whose rewritten plan
 * returns to the same review; the probes are not run again.
 */
export const GOAL_BATCH_RELEASE_OPTION = {
  release: 'release',
  revise: GOAL_BATCH_BREAK_OPTION.revise,
} as const;

/**
 * Keys of the goal asks a person waved off the approval island. They are kept
 * on the server per user, so a card dismissed on one client stays dismissed on
 * every other client of the same account. Only the newest keys are kept: old
 * ones point at asks long since answered.
 */
export const MAX_ISLAND_DISMISSALS = 200;

export const goalDecisionIslandKey = (decisionId: string): string => `goal-decision:${decisionId}`;

export const goalSignOffIslandKey = (acceptanceId: string): string =>
  `goal-sign-off:${acceptanceId}`;

/**
 * A clarification round is keyed by its questions, not just its goal: waving
 * off one round must not hide the next round the same goal asks.
 */
export const goalClarificationIslandKey = (round: {
  goalId: string;
  questions: { decisionId: string }[];
}): string => `goal-clarify:${round.goalId}:${round.questions.map((q) => q.decisionId).join(',')}`;

/** Union of the stored and new keys, newest last, capped at {@link MAX_ISLAND_DISMISSALS}. */
export const mergeIslandDismissals = (current: string[], added: string[]): string[] => {
  const fresh = added.filter(
    (key, index) => !current.includes(key) && added.indexOf(key) === index,
  );
  return fresh.length === 0 ? current : [...current, ...fresh].slice(-MAX_ISLAND_DISMISSALS);
};
