import { type LobeAgentConfig } from '@lobot/types';
import { type PartialDeep } from 'type-fest';

import { chatGroupService, type GroupMemberConfig } from '@/services/chatGroup';
import { getAgentStoreState } from '@/store/agent';
import { type ChatGroupStore } from '@/store/agentGroup/store';

export class ChatGroupMemberAction {
  constructor(_set: unknown, get: () => ChatGroupStore, _api?: unknown) {
    // keep signature aligned with StateCreator params: (set, get, api)
    void _set;
    void _api;
  }
}
