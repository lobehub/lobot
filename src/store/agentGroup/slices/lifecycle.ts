import { GROUP_CHAT_TOPIC_URL, GROUP_CHAT_URL } from '@lobechat/const';
import { type NewChatGroup } from '@lobot/types';

import { chatGroupService } from '@/services/chatGroup';
import { useChatStore } from '@/store/chat';
import { getHomeStoreState } from '@/store/home';

import { type ChatGroupStore } from '../store';

export class ChatGroupLifecycleAction {
  readonly #get: () => ChatGroupStore;

  constructor(_set: unknown, get: () => ChatGroupStore, _api?: unknown) {
    // keep signature aligned with StateCreator params: (set, get, api)
    void _set;
    void _api;

    this.#get = get;
  }

  createGroup = async (
    newGroup: Omit<NewChatGroup, 'userId'>,
    agentIds?: string[],
    silent: any = false,
  ) => {
    const { switchToGroup, refreshAgentList } = getHomeStoreState();

    const { group } = await chatGroupService.createGroup(newGroup);

    if (agentIds && agentIds.length > 0) {
      await chatGroupService.addAgentsToGroup(group.id, agentIds);

      // Wait a brief moment to ensure database transactions are committed
      // This prevents race condition where loadGroups() executes before member addition is fully persisted
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
    }

    this.#get().internal_addGroup(group);

    // Fetch full group detail to get supervisorAgentId and agents for tools injection
    await this.#get().internal_fetchGroupDetail(group.id);

    refreshAgentList();

    if (!silent) {
      switchToGroup(group.id);
    }

    return group.id;
  };
}
