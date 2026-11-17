import { type ConversationContext } from '@lobot/types';

import { conversationMessagesKey } from '@/services/message/replica';

import { type ChatStoreState } from '../../../initialState';
import { operationSelectors } from '../../operation/selectors';
import { getDbMessageByToolCallId } from './dbMessage';
import { getDisplayMessageById } from './displayMessage';

const isMessageGenerating = (id: string) => (s: ChatStoreState) =>
  operationSelectors.isMessageGenerating(id)(s); // Only check generateAI operations // Only check sendMessage operations

/** A forward transcript has rounds after its loaded pages. */
const hasLaterMessages = (context: ConversationContext) => (s: ChatStoreState) =>
  context.messageReadMode === 'forward' &&
  !!s.messagePagingMap[conversationMessagesKey(context)]?.hasMore;

export const messageStateSelectors = {
  hasLaterMessages,
  isMessageGenerating,
};
