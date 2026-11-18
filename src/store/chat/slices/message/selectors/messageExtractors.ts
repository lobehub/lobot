import type { StepContextTodos, UIChatMessage } from '@lobot/types';

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
