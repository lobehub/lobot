import type { ChatStore } from '@/store/chat/store';
import type { StoreSetter } from '@/store/types';

export class QuestionSubmissionActionImpl {
  constructor(set: StoreSetter<ChatStore>, get: () => ChatStore, _api?: unknown) {
    void _api;
  }
}

export type QuestionSubmissionAction = Pick<
  QuestionSubmissionActionImpl,
  keyof QuestionSubmissionActionImpl
>;
