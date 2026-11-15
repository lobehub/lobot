import type { ChatTopic } from '@lobechat/types';
import { resolveAgentAgencyConfig } from '@lobechat/types';

import {
  ensureAgentManagementAccess,
  getRuntimeCanManageAgent,
} from '@/helpers/agentManagementAccess';
import {
  applyTopicDeviceBinding,
  getTopicBoundDeviceId,
  resolveWorkspaceScoped,
} from '@/helpers/executionTarget';
import { getAgentStoreState } from '@/store/agent';
import { agentByIdSelectors, agentSelectors } from '@/store/agent/selectors';
import type { useChatStore } from '@/store/chat';
import { getElectronStoreState } from '@/store/electron';
import { getUserStoreState } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

/**
 * Hetero (Claude Code / Codex) run helpers shared by the generation actions,
 * continue-after-error and desktop restart recovery. Kept out of `action.ts`
 * so modules the slice imports can use them without a circular import.
 */
/**
 * Settle a regenerate / continue entry's OUTER tracking operation and fire its
 * thin UI completion hook (`onRegenerateComplete` / `onContinueComplete`).
 *
 * Each of these entries owns an outer tracking op distinct from the executor's
 * run op (`${messageKey}/${parentMessageId}`). The unified run lifecycle
 * (`buildRunLifecycle`, inside the executor) already drove the run-level terminal
 * side effects — title / queue drain / notification / complete signal — so the
 * entry only retires its own tracking op and broadcasts the UI hook. Five runtime
 * branches (regenerate × client/gateway/hetero, continue × client/gateway) shared
 * this identical two-line tail; centralized here so they converge on one adapter
 * instead of hand-rolling completion at each call site.
 */
export const settleGenerationEntry = (
  chatStore: ReturnType<typeof useChatStore.getState>,
  operationId: string,
  notify?: () => void,
) => {
  chatStore.completeOperation(operationId);
  notify?.();
};

/**
 * Resolve management access from the server before `getEffectiveAgencyConfig`
 * runs on a cold cache (page reload straight into regenerate/continue) — an
 * admin must not be downgraded to member just because the picker's hook never
 * mounted. No-ops for authors, members-with-resolved-answers, and non-workspace
 * agents; a failed fetch falls back to authorship for this run.
 */
export const ensureEffectiveAgencyAccess = async (agentId: string) => {
  const agentState = getAgentStoreState();
  const agent = agentByIdSelectors.getAgentById(agentId)(agentState);
  await ensureAgentManagementAccess({
    agentId,
    agentUserId: agent?.userId,
    currentUserId: userProfileSelectors.userId(getUserStoreState()),
    visibility: agent?.visibility,
    workspaceId: agent?.workspaceId,
  });
};

/**
 * `topic` keeps the run on the machine that conversation already ran on — see
 * `applyTopicDeviceBinding`. Omit it for agent-level decisions only.
 */
export const getEffectiveAgencyConfig = (agentId: string, topic?: ChatTopic | null) => {
  const agentState = getAgentStoreState();
  const sharedAgencyConfig = agentSelectors.getAgentConfigById(agentId)(agentState)?.agencyConfig;
  const agent = agentByIdSelectors.getAgentById(agentId)(agentState);
  const currentUserId = userProfileSelectors.userId(getUserStoreState());
  // Author-or-admin, mirroring the picker (`useAgentManagementAccess`) and the
  // server (`isResourceAuthorOrAdmin`) — an admin's own override must survive
  // a `fixed` selection policy just like the author's does.
  const canManage = getRuntimeCanManageAgent({
    agentId,
    agentUserId: agent?.userId,
    currentUserId,
  });
  const usesWorkspaceMemberSelection =
    !!agent?.workspaceId && agent.visibility !== 'private' && !canManage;
  // Every workspace caller's override matters — a manager's / private owner's
  // `local` pick also lives in `agentDeviceOverrides` (the shared row must
  // never reference a personal device); `resolveAgentAgencyConfig` decides how
  // it applies per role.
  const deviceOverride = agent?.workspaceId
    ? getUserStoreState().workspaceUserPreference.agentDeviceOverrides?.[agentId]
    : undefined;

  const { agencyConfig, workspaceScoped } = applyTopicDeviceBinding(
    {
      agencyConfig: resolveAgentAgencyConfig(sharedAgencyConfig, deviceOverride, {
        canManage,
        visibility: agent?.visibility,
        workspaceId: agent?.workspaceId,
      }),
      workspaceScoped: resolveWorkspaceScoped(usesWorkspaceMemberSelection, deviceOverride),
    },
    getTopicBoundDeviceId(topic, agentId),
    getElectronStoreState().gatewayDeviceInfo?.deviceId,
  );

  return {
    agencyConfig,
    /** True workspace membership — stays true for the author, unlike `workspaceScoped`. */
    isWorkspaceAgent: !!agent?.workspaceId,
    workspaceScoped,
  };
};

/**
 * Prompt that resumes an interrupted hetero run instead of restarting it.
 *
 * Neither CLI exposes a "keep going, no new input" primitive — `claude --resume`
 * and `codex exec resume` both require a prompt — so continuing necessarily adds
 * one user turn to the CLI's own transcript. That transcript already holds every
 * completed step (we resume the same session id), so the instruction only has to
 * stop the model from redoing them. Not localized: it is model input, not UI.
 */
