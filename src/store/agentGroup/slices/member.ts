import { type ChatGroupStore } from '@/store/agentGroup/store';

export class ChatGroupMemberAction {
  constructor(_set: unknown, get: () => ChatGroupStore, _api?: unknown) {
    // keep signature aligned with StateCreator params: (set, get, api)
    void _set;
    void _api;
  }
}
