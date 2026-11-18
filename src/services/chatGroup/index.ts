import { type AgentGroupDetail } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';
import { type ChatGroupItem, type NewChatGroup, type NewChatGroupAgent } from '@/types/serverData';

export interface GroupMemberConfig {
  avatar?: string;
  backgroundColor?: string;
  description?: string;
  model?: string;
  plugins?: string[];
  provider?: string;
  systemRole?: string;
  tags?: string[];
  title?: string;
}

interface SupervisorConfig {
  avatar?: string;
  backgroundColor?: string;
  description?: string;
  model?: string;
  params?: any;
  provider?: string;
  systemRole?: string;
  tags?: string[];
  title?: string;
}

class ChatGroupService {
  /**
   * Create a group with a supervisor agent.
   * The supervisor agent is automatically created as a virtual agent.
   */
  createGroup = (
    params: Omit<NewChatGroup, 'userId'>,
  ): Promise<{ group: ChatGroupItem; supervisorAgentId: string }> => {
    return lambdaClient.group.createGroup.mutate({
      ...params,
      config: params.config as any,
    });
  };

  /**
   * Create a group with virtual member agents in one request.
   * This is the recommended way to create a group from a template.
   * Returns groupId, supervisorAgentId, and member agentIds.
   */
  createGroupWithMembers = (
    groupConfig: Omit<NewChatGroup, 'userId'>,
    members: GroupMemberConfig[],
    supervisorConfig?: SupervisorConfig,
  ): Promise<{ agentIds: string[]; groupId: string; supervisorAgentId: string }> => {
    return lambdaClient.group.createGroupWithMembers.mutate({
      groupConfig: {
        ...groupConfig,
        config: groupConfig.config as any,
      },
      members,
      supervisorConfig,
    });
  };

  updateGroup = (id: string, value: Partial<ChatGroupItem>): Promise<ChatGroupItem> => {
    return lambdaClient.group.updateGroup.mutate({
      id,
      value: {
        ...value,
        config: value.config as any,
      },
    });
  };

  deleteGroup = (id: string) => {
    return lambdaClient.group.deleteGroup.mutate({ id });
  };

  getGroupDetail = (id: string): Promise<AgentGroupDetail | null> => {
    return lambdaClient.group.getGroupDetail.query({ id });
  };

  getGroups = (): Promise<ChatGroupItem[]> => {
    return lambdaClient.group.getGroups.query();
  };

  addAgentsToGroup = (
    groupId: string,
    agentIds: string[],
  ): Promise<{ added: NewChatGroupAgent[]; existing: string[] }> => {
    return lambdaClient.group.addAgentsToGroup.mutate({ agentIds, groupId });
  };

  /**
   * Duplicate a chat group with all its members.
   * Returns the new group ID and supervisor agent ID.
   */
  duplicateGroup = (
    groupId: string,
    newTitle?: string,
  ): Promise<{ groupId: string; supervisorAgentId: string } | null> => {
    return lambdaClient.group.duplicateGroup.mutate({ groupId, newTitle });
  };

  /**
   * Async history-backfill progress for a transferred/copied group.
   * `topicIds` caps the reported pending set to what the client can show.
   */
  getTransferJobStatus = async (groupId: string, topicIds: string[]) => {
    return lambdaClient.group.getTransferJobStatus.query({ groupId, topicIds });
  };
}

export const chatGroupService = new ChatGroupService();
