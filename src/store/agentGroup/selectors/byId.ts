import { type AgentGroupDetail, type AgentGroupMember } from '@lobot/types';

import { DEFAULT_CHAT_GROUP_META_CONFIG } from '@/const/settings';
import { merge } from '@/utils/merge';

import { type ChatGroupState } from '../initialState';
import { type ChatGroupStore } from '../store';

const groupById =
  (id: string) =>
  (s: ChatGroupState): AgentGroupDetail | undefined =>
    s.groupMap[id];

const groupMeta = (groupId: string) => (s: ChatGroupStore) => {
  const group = groupById(groupId)(s);
  return merge(DEFAULT_CHAT_GROUP_META_CONFIG, {
    avatar: group?.avatar || undefined,
    backgroundColor: group?.backgroundColor || undefined,
    description: group?.description || '',
    marketIdentifier: group?.marketIdentifier || undefined,
    title: group?.title || '',
  });
};

/**
 * Get participant members in a group (excluding supervisor)
 * Used for UI display where supervisor should not be shown in the member list
 */
const groupMembers =
  (groupId: string) =>
  (s: ChatGroupStore): AgentGroupMember[] => {
    const group = groupById(groupId)(s);
    const agents = group?.agents || [];
    return agents.filter((agent) => !agent.isSupervisor);
  };

const groupMemberAvatars =
  (groupId: string) =>
  (s: ChatGroupStore): { avatar?: string; background?: string; seed: string }[] =>
    groupMembers(groupId)(s).map((agent) => ({
      avatar: agent.avatar || undefined,
      background: agent.backgroundColor || undefined,
      seed: agent.id,
    }));

export const agentGroupByIdSelectors = {
  groupById,
  groupMemberAvatars,
  groupMembers,
  groupMeta,
};
