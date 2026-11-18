import { useAgentManagementAccess } from '@/features/ResourcePermission/useAgentManagementAccess';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';
import { useUserStore } from '@/store/user';

/** Reactive counterpart used by capability-gated chat input controls. */
export const useEffectiveAgentModePreference = (agentId: string) => {
  const [agent, sharedEnableAgentMode] = useAgentStore((state) => [
    agentByIdSelectors.getAgentById(agentId)(state),
    agentByIdSelectors.getAgentEnableModeById(agentId)(state),
  ]);
  const { canManageAgent, isAccessLoading } = useAgentManagementAccess(agentId);
  const usesWorkspaceMemberMode =
    !!agent?.workspaceId && agent.visibility !== 'private' && !canManageAgent;
  const storePreference = useUserStore((state) => state.workspaceUserPreference);
  const { data: fetchedPreference, isLoading } = useUserStore(
    (state) => state.useFetchWorkspaceUserPreference,
  )();
  const preference = fetchedPreference === undefined ? storePreference : (fetchedPreference ?? {});
  const memberOverride = usesWorkspaceMemberMode
    ? preference.agentModeOverrides?.[agentId]
    : undefined;

  return {
    enableAgentMode: memberOverride ?? sharedEnableAgentMode,
    isPreferenceLoading: isAccessLoading || (usesWorkspaceMemberMode && isLoading),
    usesWorkspaceMemberMode,
  };
};
