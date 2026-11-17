import { toast } from '@lobehub/ui';
import type { ConversationContext, UIChatMessage } from '@lobot/types';
import { t } from 'i18next';

import type { AgentInterventionSourceAction } from '@/services/aiAgent';
import { messageService } from '@/services/message';
import { shareChatService } from '@/services/shareChat';
import { dbMessageSelectors } from '@/store/chat/slices/message/selectors';
import type { ChatStore } from '@/store/chat/store';
import type { StoreSetter } from '@/store/types';

import type { QuestionSubmissionPhase } from '../../initialState';

export class QuestionSubmissionActionImpl {
  constructor(set: StoreSetter<ChatStore>, get: () => ChatStore, _api?: unknown) {
    void _api;
  }
}

export type QuestionSubmissionAction = Pick<
  QuestionSubmissionActionImpl,
  keyof QuestionSubmissionActionImpl
>;
