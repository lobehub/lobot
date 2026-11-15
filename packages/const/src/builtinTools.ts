/**
 * Identifiers and API names of the builtin tools a desktop client still has to
 * recognize when it renders a server-run conversation. The tools themselves run
 * on the server; the client only matches tool calls against these values.
 */

export const AgentManagementIdentifier = 'lobe-agent-management';
export const AuvIdentifier = 'lobe-computer-use';
export const CloudSandboxIdentifier = 'lobe-cloud-sandbox';
export const GoalIdentifier = 'builtin-goal';
/** Goal calls approved before the rename still name the tool `lobe-goal`. */
export const LegacyGoalIdentifier = 'lobe-goal';
export const ImageGenerationIdentifier = 'lobe-image-generation';
export const LobeActivatorIdentifier = 'lobe-activator';
export const LocalSystemIdentifier = 'lobe-local-system';
export const SkillsIdentifier = 'lobe-skills';
export const TaskIdentifier = 'lobe-task';
export const WebOnboardingIdentifier = 'lobe-web-onboarding';

export const isGoalIdentifier = (identifier: unknown): boolean =>
  identifier === GoalIdentifier || identifier === LegacyGoalIdentifier;

export const FileEditApiName = {
  editFile: 'editFile',
  execScript: 'execScript',
  moveFiles: 'moveFiles',
  runCommand: 'runCommand',
  writeFile: 'writeFile',
} as const;

export const ImageGenerationApiName = {
  generateImage: 'generateImage',
} as const;

export const TaskApiName = {
  runTask: 'runTask',
  runTasks: 'runTasks',
  updateTaskStatus: 'updateTaskStatus',
} as const;

export const WebOnboardingApiName = {
  finishOnboarding: 'finishOnboarding',
} as const;

const GOAL_COMMAND_PATTERN = /^\s*\/goal(?:\s|$)/i;

/** Whether a user prompt explicitly requests the canonical goal workflow. */
export const isGoalPrompt = (prompt: unknown): boolean =>
  typeof prompt === 'string' && GOAL_COMMAND_PATTERN.test(prompt);

// ── Cloud sandbox drive ──────────────────────────────────────────────

export type SandboxDrive = 'personal' | 'public';

/** The drive root a sandbox conversation starts in. */
export const SANDBOX_DRIVE_ROOT = '.';

/** Where every project keeps its repository checkouts on the drive. */
export const PROJECT_DRIVE_ROOT = 'projects';

/**
 * One path segment from an id. Ids are already path-safe (`prj_…`, UUIDs); any
 * other character becomes `_`, which also rules out `.`/`..` segments.
 */
const toSegment = (value: string) => value.replaceAll(/[^\w-]/g, '_');

/**
 * A project's checkout of one repository on the drive: one folder per project
 * and environment, shared by every conversation in the project. Derived from
 * ids alone so renaming the project or environment never moves the checkout.
 */
export const projectCheckoutDirectory = (projectId: string, environmentId: string) =>
  `${PROJECT_DRIVE_ROOT}/${toSegment(projectId)}/${toSegment(environmentId)}`;

// ── Task list ────────────────────────────────────────────────────────

/** Look-back windows a task list can keep completed and canceled tasks for. */
export const TASK_COMPLETED_WINDOWS = ['day', 'week', 'month'] as const;

export type TaskCompletedWindow = (typeof TASK_COMPLETED_WINDOWS)[number];

// ── Misc tool payload types ──────────────────────────────────────────

export type NotebookDocumentType = 'article' | 'markdown' | 'note' | 'report';

export interface VideoGenerationModelRef {
  model: string;
  provider: string;
}
