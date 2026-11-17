import type { StepActivatedSkill, StepContextTodos, UIChatMessage } from '@lobot/types';

type UnknownRecord = Record<PropertyKey, unknown>;

/**
 * Checks for any non-null object, including arrays.
 *
 * Prefer `isRecord` for normal object maps. Use this only when unknown object-shaped payloads
 * must be preserved instead of being classified as empty or invalid.
 */
const isObjectLike = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

/**
 * Checks for non-null, non-array objects.
 *
 * This intentionally accepts class instances, `Error`, `Date`, and null-prototype objects. Use
 * `isPlainRecord` when prototype-strict plain object semantics are required.
 */
const isRecord = (value: unknown): value is UnknownRecord =>
  isObjectLike(value) && !Array.isArray(value);

const isPlainRecord = (value: unknown): value is UnknownRecord => {
  if (!isRecord(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/**
 * Wire-format tool identifiers that carry skill activations in their
 * pluginState. Literal copies of `SkillsIdentifier`
 * (@lobechat/builtin-tool-skills) and `LobeActivatorIdentifier`
 * (@lobechat/builtin-tool-activator) — both are frozen, persisted in DB
 * message rows, and not importable here without adding tool-package deps to
 * the runtime core.
 */
const SKILLS_IDENTIFIER = 'lobe-skills';
const ACTIVATOR_IDENTIFIER = 'lobe-activator';

/**
 * Options for message visitor traversal
 */
interface MessageVisitorOptions {
  /**
   * Filter by message role (e.g. 'tool', 'user', 'assistant')
   */
  role?: UIChatMessage['role'];
}

/**
 * A single tool invocation observed in the conversation, normalized across the
 * two message shapes activations can arrive in (see
 * `collectToolInvocations`).
 */
interface ToolInvocation {
  apiName?: string;
  identifier?: string;
  state?: any;
}

/**
 * Normalize one message into the tool invocations it carries.
 *
 * Two shapes must be handled:
 * 1. Flat DB rows — `role='tool'` messages with `plugin` / `pluginState`
 *    (client store, `execAgent` initialMessages, same-run pushed results).
 * 2. Virtual grouped nodes produced by conversation-flow `parse()` — the
 *    server runtime rehydrates `state.messages` from the DB at every step
 *    (`rehydrateStateMessagesFromDB`), which folds completed turns into
 *    `assistantGroup` / `supervisor` nodes: tool rows disappear as standalone
 *    entries and live on `children[].tools[]` instead, with the original
 *    `pluginState` re-attached as `result.state` (see
 *    FlatListBuilder.createAssistantGroupMessage). Without this branch,
 *    cross-turn skill activations are invisible to later runs.
 *    `compressedGroup` nodes keep their members on `compressedMessages` in
 *    the same flat-list shape, so recurse into them.
 */
const collectToolInvocations = (msg: UIChatMessage): ToolInvocation[] => {
  if (msg.role === 'tool') {
    return [
      { apiName: msg.plugin?.apiName, identifier: msg.plugin?.identifier, state: msg.pluginState },
    ];
  }

  const invocations: ToolInvocation[] = [];

  const { children } = msg;
  if (Array.isArray(children)) {
    for (const child of children) {
      if (!Array.isArray(child?.tools)) continue;
      for (const tool of child.tools) {
        invocations.push({
          apiName: tool?.apiName,
          identifier: tool?.identifier,
          state: tool?.result?.state,
        });
      }
    }
  }

  const { compressedMessages } = msg;
  if (Array.isArray(compressedMessages)) {
    for (const compressed of compressedMessages) {
      invocations.push(...collectToolInvocations(compressed));
    }
  }

  return invocations;
};

const isTodoItem = (value: unknown): value is StepContextTodos['items'][number] =>
  isPlainRecord(value) &&
  typeof value.text === 'string' &&
  (value.status === 'todo' || value.status === 'processing' || value.status === 'completed');

/** Normalize persisted canonical and legacy TODO states without guessing alternate fields. */
export const normalizeTodosState = (
  value: unknown,
  fallbackUpdatedAt: string,
): StepContextTodos | undefined => {
  const items = Array.isArray(value)
    ? value
    : isPlainRecord(value) && Array.isArray(value.items)
      ? value.items
      : undefined;

  if (!items || !items.every(isTodoItem)) return undefined;

  const updatedAt =
    isPlainRecord(value) && isNonEmptyString(value.updatedAt) ? value.updatedAt : fallbackUpdatedAt;

  return { items, updatedAt };
};

/** Select the newest valid exact `pluginState.todos` state across flat and grouped messages. */
export const extractTodosFromMessages = (
  messages: UIChatMessage[],
): StepContextTodos | undefined => {
  const fallbackUpdatedAt = new Date().toISOString();

  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
    const invocations = collectToolInvocations(messages[messageIndex]);
    for (let invocationIndex = invocations.length - 1; invocationIndex >= 0; invocationIndex--) {
      const state = invocations[invocationIndex].state;
      if (!isPlainRecord(state) || !Object.hasOwn(state, 'todos')) continue;

      const todos = normalizeTodosState(state.todos, fallbackUpdatedAt);
      if (todos !== undefined) return todos;
    }
  }

  return undefined;
};

/**
 * Accumulate activated skills from all activateSkill / activateTools tool
 * messages. Skills once activated remain active for the rest of the
 * conversation; the skill id (or name, for filesystem/builtin activations that
 * persist no id) deduplicates — a reactivation updates the entry AND moves it
 * to the end, since exec paths treat the last entry as the most recent
 * activation when picking the script cwd.
 *
 * Shared by the client transport (chat store dbMessage selector feeding
 * `computeStepContext`) and the server runtime executors (`callTool` /
 * `callToolsBatch`), so both execution paths resolve the same activation set
 * for skills `execScript`. Handles both flat `role='tool'` rows and the
 * conversation-flow grouped shape (`assistantGroup` etc.) — see
 * `collectToolInvocations`.
 */
export const extractActivatedSkillsFromMessages = (
  messages: UIChatMessage[],
): StepActivatedSkill[] | undefined => {
  const skillsMap = new Map<string, StepActivatedSkill>();

  for (const msg of messages) {
    for (const invocation of collectToolInvocations(msg)) {
      if (!(
        invocation.identifier === SKILLS_IDENTIFIER ||
        invocation.identifier === ACTIVATOR_IDENTIFIER
      ))
        continue;

      // Direct activateSkill calls — state has top-level name (id only for DB
      // skills; filesystem/builtin activations persist no id, so `name` alone
      // must be enough to keep them — server exec paths match by name anyway).
      if (invocation.apiName === 'activateSkill' && invocation.state?.name) {
        const id = invocation.state.id as string | undefined;
        const name = invocation.state.name as string;
        const key = id ?? name;
        // Delete before set so reactivation moves the skill to the end —
        // downstream exec paths pick the LAST resolvable skill as cwd, so
        // insertion order must reflect activation recency (A → B → A must
        // yield [B, A], not Map#set's kept-in-place [A, B]).
        skillsMap.delete(key);
        skillsMap.set(key, {
          description: invocation.state.description as string | undefined,
          ...(id && { id }),
          name,
        });
      }

      // activateTools fallback — skills nested in pluginState.activatedSkills[]
      if (
        invocation.apiName === 'activateTools' &&
        Array.isArray(invocation.state?.activatedSkills)
      ) {
        for (const skill of invocation.state.activatedSkills as Array<{
          description?: string;
          id?: string;
          name?: string;
        }>) {
          if (skill.name) {
            const key = skill.id ?? skill.name;
            // Same delete-before-set as above: keep activation recency.
            skillsMap.delete(key);
            skillsMap.set(key, {
              description: skill.description,
              ...(skill.id && { id: skill.id }),
              name: skill.name,
            });
          }
        }
      }
    }
  }

  return skillsMap.size > 0 ? [...skillsMap.values()] : undefined;
};
