import { MESSAGE_CANCEL_FLAT } from '@lobechat/const';
import { type ConversationContext } from '@lobechat/types';

import { type ChatInputEditor } from '@/features/ChatInput';
import { type OptimisticUpdateContext } from '@/store/chat/slices/message/actions/optimisticUpdate';
import { AI_RUNTIME_OPERATION_TYPES } from '@/store/chat/slices/operation/types';
import { type ChatStore } from '@/store/chat/store';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';
import { type StoreSetter } from '@/store/types';

type Setter = StoreSetter<ChatStore>;

export const conversationControl = (set: Setter, get: () => ChatStore, _api?: unknown) =>
  new ConversationControlActionImpl(set, get, _api);

export class ConversationControlActionImpl {
  readonly #get: () => ChatStore;

  constructor(set: Setter, get: () => ChatStore, _api?: unknown) {
    void _api;
    void set;
    this.#get = get;
  }

  stopGenerateMessage = (): void => {
    const { activeAgentId, activeTopicId, cancelOperations } = this.#get();

    // Cancel running agent-runtime operations in the current context —
    // client-side (execAgentRuntime), heterogeneous agent (execHeterogeneousAgent),
    // and Gateway-mode (execServerAgentRuntime).
    cancelOperations(
      {
        type: AI_RUNTIME_OPERATION_TYPES,
        status: 'running',
        agentId: activeAgentId,
        topicId: activeTopicId,
      },
      MESSAGE_CANCEL_FLAT,
    );
  };

  cancelSendMessageInServer = (
    target?: string | ConversationContext,
    editor?: ChatInputEditor | null,
  ): void => {
    const { activeAgentId, activeGroupId, activeThreadId, activeTopicId } = this.#get();

    const activeContext: ConversationContext = {
      agentId: activeAgentId,
      groupId: activeGroupId,
      threadId: activeThreadId,
      topicId: activeTopicId,
    };
    const targetContext =
      typeof target === 'object'
        ? target
        : {
            ...activeContext,
            topicId: target ?? activeTopicId,
          };
    const contextKey = messageMapKey(targetContext);

    // Cancel operations in the operation system
    const operationIds = this.#get().operationsByContext[contextKey] || [];

    operationIds.forEach((opId) => {
      const operation = this.#get().operations[opId];
      if (operation && operation.type === 'sendMessage' && operation.status === 'running') {
        this.#get().cancelOperation(opId, 'User cancelled');
      }
    });

    // An embedded conversation (for example the create-thread portal) owns a
    // separate editor even though ChatStore only tracks the most recently
    // mounted editor globally. Prefer the explicitly supplied editor. The
    // active-conversation fallback preserves the legacy call sites.
    const targetEditor =
      editor ?? (contextKey === messageMapKey(activeContext) ? this.#get().mainInputEditor : null);
    if (targetEditor) {
      // Only the latest send can own the draft. Never fall back to a stale
      // snapshot from an earlier turn when stopping an accepted message.
      const operationId = [...operationIds]
        .reverse()
        .find((id) => this.#get().operations[id]?.type === 'sendMessage');
      const operation = operationId ? this.#get().operations[operationId] : undefined;
      if (operation?.status === 'cancelled' && operation.metadata.inputEditorTempState) {
        const snapshot = operation.metadata.inputEditorTempState;
        this.#get().updateOperationMetadata(operation.id, { inputEditorTempState: null });
        targetEditor.setJSONState(snapshot);
      }
    }
  };

  clearSendMessageError = (): void => {
    const { activeAgentId, activeGroupId, activeThreadId, activeTopicId } = this.#get();
    const contextKey = messageMapKey({
      agentId: activeAgentId,
      groupId: activeGroupId,
      threadId: activeThreadId,
      topicId: activeTopicId,
    });
    const operationIds = this.#get().operationsByContext[contextKey] || [];

    // Clear error message from all sendMessage operations in current context
    operationIds.forEach((opId) => {
      const op = this.#get().operations[opId];
      if (op && op.type === 'sendMessage' && op.metadata.inputSendErrorMsg) {
        this.#get().updateOperationMetadata(opId, { inputSendErrorMsg: undefined });
      }
    });
  };

  switchMessageBranch = async (
    messageId: string,
    branchIndex: number,
    context?: OptimisticUpdateContext,
  ): Promise<void> => {
    const store = this.#get();
    const messageContext = store.internal_getConversationContext(context);
    // A branch change only changes the displayed reply; it does not authorize
    // recovery of an old failure when its card mounts.
    store.revokeHeteroAutoRetry(messageContext);
    await this.#get().optimisticUpdateMessageMetadata(
      messageId,
      { activeBranchIndex: branchIndex },
      context,
    );
  };
}

export type ConversationControlAction = Pick<
  ConversationControlActionImpl,
  keyof ConversationControlActionImpl
>;
