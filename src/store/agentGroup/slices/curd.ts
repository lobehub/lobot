import { type LobeChatGroupConfig } from '@lobot/types';

import { DEFAULT_CHAT_GROUP_CHAT_CONFIG } from '@/const/settings';
import { chatGroupService } from '@/services/chatGroup';
import { type ChatGroupStore } from '@/store/agentGroup/store';
import { type StoreSetter } from '@/store/types';
import { type ChatGroupItem } from '@/types/serverData';

import { agentGroupSelectors } from '../selectors';

type Setter = StoreSetter<ChatGroupStore>;

export class ChatGroupCurdAction {
  constructor(set: Setter, get: () => ChatGroupStore, _api?: unknown) {
    // keep signature aligned with StateCreator params: (set, get, api)
    void _api;
  }
}
