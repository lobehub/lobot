import {
  type ChatToolPayloadWithResult,
  isHeterogeneousInterventionExpired,
  readHeterogeneousInterventionDeadline,
  type ToolIntervention,
  type UIChatMessage,
} from '@lobot/types';

interface PendingIntervention {
  apiName: string;
  /**
   * Id of the assistant turn that emitted this tool call.
   *
   * The list itself spans the WHOLE conversation, so any consumer that wants to
   * act on "this parallel batch" (e.g. approve-all) must group by this field
   * first — two pending calls can belong to different turns, and resolving them
   * together would execute them under one anchor with unrelated results.
   * `undefined` means the owner could not be determined; treat such an entry as
   * its own group rather than folding it in with the others.
   */
  assistantGroupId?: string;
  batchId?: string;
  /**
   * Producer's wall-clock deadline (unix ms) when it stamped one. Carried so
   * consumers can drop the card the moment it passes — the list itself is only
   * recomputed when the store changes, and nothing changes at the deadline.
   */
  deadline?: number;
  identifier: string;
  intervention: ToolIntervention & { status: 'pending' };
  operationId?: string;
  requestArgs: string;
  toolCallId: string;
  toolMessageId: string;
}

export const getPendingInterventions = (
  displayMessages: UIChatMessage[],
): PendingIntervention[] => {
  const pending: PendingIntervention[] = [];

  for (const msg of displayMessages) {
    // Standalone tool messages with pluginIntervention pending
    if (
      msg.role === 'tool' &&
      msg.pluginIntervention?.status === 'pending' &&
      msg.plugin &&
      !msg.id.startsWith('tmp_') &&
      // Past the producer's own deadline nobody is waiting for this answer.
      // Keeping it in the pending list would put an unanswerable card in front
      // of the user on every surface that reads this list.
      !isHeterogeneousInterventionExpired(msg.pluginState)
    ) {
      pending.push({
        apiName: msg.plugin.apiName,
        // A standalone tool row parents directly to its calling assistant.
        assistantGroupId: msg.parentId,
        batchId: msg.pluginIntervention.batchId,
        deadline: readHeterogeneousInterventionDeadline(msg.pluginState),
        identifier: msg.plugin.identifier,
        intervention: msg.pluginIntervention as ToolIntervention & { status: 'pending' },
        operationId: msg.pluginIntervention.operationId,
        requestArgs: msg.plugin.arguments || '',
        toolCallId: msg.tool_call_id || msg.id,
        toolMessageId: msg.id,
      });
    }

    // Messages with children blocks containing tools (assistantGroup, assistant, etc.)
    if (msg.children) {
      for (const block of msg.children) {
        if (!block.tools) continue;
        collectPendingTools(block.tools, pending, msg.id);
      }
    }
  }

  return pending;
};

const collectPendingTools = (
  tools: ChatToolPayloadWithResult[],
  pending: PendingIntervention[],
  assistantGroupId?: string,
) => {
  for (const tool of tools) {
    if (
      tool.intervention?.status === 'pending' &&
      tool.result_msg_id &&
      !tool.result_msg_id.startsWith('tmp_') &&
      // Same rule as the standalone tool row; the folded entry mirrors the
      // producer's deadline onto `result.state`.
      !isHeterogeneousInterventionExpired(tool.result?.state)
    ) {
      pending.push({
        apiName: tool.apiName,
        assistantGroupId,
        batchId: tool.intervention.batchId,
        deadline: readHeterogeneousInterventionDeadline(tool.result?.state),
        identifier: tool.identifier,
        intervention: tool.intervention as ToolIntervention & { status: 'pending' },
        operationId: tool.intervention.operationId,
        requestArgs: tool.arguments || '',
        toolCallId: tool.id,
        toolMessageId: tool.result_msg_id,
      });
    }
  }
};
