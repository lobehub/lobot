import type { ISnapshotStore } from '../store/types';
import type { ExecutionSnapshot } from '../types';

/**
 * Finalize a partial snapshot into a completed ExecutionSnapshot.
 * Called from the executeStep loop when the operation completes.
 */
export async function finalizeSnapshot(
  store: ISnapshotStore,
  operationId: string,
  completion: {
    error?: { message: string; type: string };
    reason: string;
    totalCost: number;
    totalSteps: number;
    totalTokens: number;
  },
): Promise<void> {
  const partial = await store.loadPartial(operationId);
  if (!partial) return;

  const snapshot: ExecutionSnapshot = {
    agentId: partial.agentId,
    completedAt: Date.now(),
    completionReason: completion.reason as ExecutionSnapshot['completionReason'],
    error: completion.error,
    model: partial.model,
    operationId,
    provider: partial.provider,
    startedAt: partial.startedAt ?? Date.now(),
    steps: (partial.steps ?? []).sort((a, b) => a.stepIndex - b.stepIndex),
    topicId: partial.topicId,
    totalCost: completion.totalCost,
    totalSteps: completion.totalSteps,
    totalTokens: completion.totalTokens,
    traceId: operationId,
    userId: partial.userId,
  };

  await store.save(snapshot);
  await store.removePartial(operationId);
}
