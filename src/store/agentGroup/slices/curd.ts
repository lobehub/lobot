import { type ChatGroupStore } from '@/store/agentGroup/store';
import { type StoreSetter } from '@/store/types';

type Setter = StoreSetter<ChatGroupStore>;

export class ChatGroupCurdAction {
  constructor(set: Setter, get: () => ChatGroupStore, _api?: unknown) {
    // keep signature aligned with StateCreator params: (set, get, api)
    void _api;
  }
}
