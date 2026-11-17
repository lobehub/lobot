import { copyToClipboard } from '@lobehub/ui';
import { type MessageMetadata, TraceEventType } from '@lobot/types';
import isEqual from 'fast-deep-equal';

import { messageService } from '@/services/message';
import { topicService } from '@/services/topic';
import { type ChatStore } from '@/store/chat/store';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { dbMessageSelectors, displayMessageSelectors } from '../../../selectors';
import { toggleBooleanList } from '../../../utils';
import { type OptimisticUpdateContext } from './optimisticUpdate';

const n = setNamespace('m');

/**
 * Public API for components
 * These methods are directly called by UI components
 */

type Setter = StoreSetter<ChatStore>;

export class MessagePublicApiActionImpl {
  readonly #get: () => ChatStore;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ChatStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  addUserMessage = async ({
    message,
    fileList,
    metadata,
  }: {
    message: string;
    fileList?: string[];
    metadata?: MessageMetadata;
  }): Promise<void> => {
    const {
      optimisticCreateMessage,
      updateMessageInput,
      activeTopicId,
      activeAgentId,
      activeThreadId,
      activeGroupId,
    } = this.#get();
    if (!activeAgentId) return;

    const parentId = displayMessageSelectors.lastDisplayMessageId(this.#get());

    const result = await optimisticCreateMessage({
      content: message,
      files: fileList,
      role: 'user',
      agentId: activeAgentId,
      topicId: activeTopicId,
      threadId: activeThreadId,
      groupId: activeGroupId,
      parentId,
      ...(metadata ? { metadata } : {}),
    });

    if (result) {
      updateMessageInput('');
    }
  };

  deleteMessage = async (id: string, context?: OptimisticUpdateContext): Promise<void> => {
    const message = displayMessageSelectors.getDisplayMessageById(id)(this.#get());
    if (!message) return;

    let ids = [message.id];

    // Handle assistantGroup messages: delete all child blocks and tool results
    if (message.role === 'assistantGroup' && message.children) {
      // Collect all child block IDs
      const childIds = message.children.map((child) => child.id);
      ids = ids.concat(childIds);

      // Collect all tool result IDs from children
      const toolResultIds = message.children.flatMap((child) => {
        if (!child.tools) return [];
        return child.tools.filter((tool) => tool.result?.id).map((tool) => tool.result!.id);
      });
      ids = ids.concat(toolResultIds);
    }

    await this.#get().optimisticDeleteMessages(ids, context);
  };

  updateMessageInput = (message: string): void => {
    if (isEqual(message, this.#get().inputMessage)) return;

    this.#set({ inputMessage: message }, false, n('updateMessageInput', message));
  };
}

export type MessagePublicApiAction = Pick<
  MessagePublicApiActionImpl,
  keyof MessagePublicApiActionImpl
>;
