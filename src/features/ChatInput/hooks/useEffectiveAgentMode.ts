import { useEffectiveAgentModePreference } from './effectiveAgentModePreference';

type ChatInputMode = 'agent' | 'chat';

interface ResolveEffectiveAgentModeParams {
  enableAgentMode: boolean;
  /**
   * Whether the aiProvider runtime-state (the enabled-model list + abilities)
   * has finished loading. Defaults to `true` so callers that don't track it keep
   * the prior behaviour.
   */
  isModelListReady?: boolean;
  supportToolUse: boolean;
}

export const resolveEffectiveAgentMode = ({
  enableAgentMode,
  isModelListReady = true,
  supportToolUse,
}: ResolveEffectiveAgentModeParams) => {
  // While the model list is not ready, `supportToolUse` is `false` only because
  // the model hasn't hydrated into the store yet — not because it lacks tool
  // calling. Downgrading to chat mode on that transient unknown would drop tools
  // and flash the mode pill to "chat" on first paint. Assume tool use is
  // available while loading and honour the user's stored intent; the real
  // capability re-evaluates once the list loads.
  const effectiveSupportToolUse = isModelListReady ? supportToolUse : true;

  const currentMode: ChatInputMode = enableAgentMode && effectiveSupportToolUse ? 'agent' : 'chat';
  // Example: stored Agent mode + a model without tool calling should render chat-only runtime UI.
  const isAgentRuntimeMode = currentMode === 'agent';

  return {
    canSelectAgentMode: effectiveSupportToolUse,
    currentMode,
    isAgentModeUnavailable: enableAgentMode && !effectiveSupportToolUse,
    isAgentRuntimeMode,
    supportToolUse: effectiveSupportToolUse,
  };
};

/**
 * Agent mode for a chat composer. Agents run in their own runtime, which always calls tools, so
 * only the stored preference decides it.
 */
export const useEffectiveAgentMode = (agentId: string) => {
  const { enableAgentMode, isPreferenceLoading, usesWorkspaceMemberMode } =
    useEffectiveAgentModePreference(agentId);

  return {
    ...resolveEffectiveAgentMode({ enableAgentMode, supportToolUse: true }),
    isPreferenceLoading,
    usesWorkspaceMemberMode,
  };
};

/** Same as `useEffectiveAgentMode`: kept for surfaces with no topic context. */
export const useAgentDefaultModelAgentMode = useEffectiveAgentMode;
