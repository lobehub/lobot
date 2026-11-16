import type { SQL } from 'drizzle-orm';
import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm';

import { topics } from '../schemas/topic';
import { topicCommentMentions, topicComments } from '../schemas/topicComment';
import type { LobeChatDatabase, Transaction } from '../type';

export const TOPIC_COMMENT_TRANSFER_HAS_FOREIGN_AUTHORS =
  'Topic transfer includes comments authored by another user';

/**
 * Keeps the denormalized comment scope consistent when topics change
 * ownership. `AgentModel.transferAgent` and
 * `AgentGroupRepository.transferToWorkspace` rewrite `topics.workspaceId`
 * (including to NULL for personal scope); without this call the comments keep
 * the source workspaceId — destination-scoped reads lose them, source-scoped
 * reads keep leaking them, and deleting the source workspace cascades rows
 * that no longer belong to it. Must run inside the same transaction that
 * moves the topics.
 *
 * - Cross-workspace move: comments and mention rows follow the topic — they
 *   are part of its history, exactly like `messages`. Authors / mentioned
 *   users may not be members of the target workspace; that renders the same
 *   as any other non-member author (same class as a deactivated account).
 * - Move to personal scope: comments are deleted. Personal topics cannot be
 *   commented on by design and `workspaceId` is NOT NULL, so there is no
 *   representable state to keep. One DELETE removes roots and replies alike —
 *   parent and child rows die in the same statement, so the self-FK
 *   (NO ACTION) passes; mention rows go via ON DELETE CASCADE.
 */
export const syncTopicCommentsOnTopicTransfer = async (
  trx: Transaction,
  topicIds: string[],
  targetWorkspaceId: string | null,
): Promise<void> => {
  if (topicIds.length === 0) return;

  if (!targetWorkspaceId) {
    await trx.delete(topicComments).where(inArray(topicComments.topicId, topicIds));
    return;
  }

  await trx
    .update(topicComments)
    // Moving a comment is not an author edit. Explicitly preserve updatedAt to
    // bypass the schema's Drizzle $onUpdate hook.
    .set({ updatedAt: topicComments.updatedAt, workspaceId: targetWorkspaceId })
    .where(inArray(topicComments.topicId, topicIds));

  await trx
    .update(topicCommentMentions)
    .set({ workspaceId: targetWorkspaceId })
    .where(
      inArray(
        topicCommentMentions.commentId,
        trx
          .select({ id: topicComments.id })
          .from(topicComments)
          .where(inArray(topicComments.topicId, topicIds)),
      ),
    );
};

/**
 * Whether any comment on the given topics was authored by someone other than
 * `userId`. Transfer guards (`AgentModel.transferHasForeignRows`,
 * `AgentGroupRepository.transferHasForeignRows`) must include this check:
 * comments move — or die, when the target is personal scope — with their
 * topics (see {@link syncTopicCommentsOnTopicTransfer}), so a non-owner
 * member must not be able to rehome or destroy a teammate's comment just
 * because every other cascaded row happens to be their own.
 *
 * `topicWhere` is a predicate over the joined `topics` table selecting the
 * topics the transfer would move. NULL authors (account deleted) count as
 * foreign: the row is definitionally not the caller's, and SQL `ne()` would
 * silently skip it.
 */
export const hasForeignTopicComments = async (
  db: Pick<LobeChatDatabase, 'select'>,
  userId: string,
  topicWhere: SQL,
): Promise<boolean> => {
  const [foreign] = await db
    .select({ id: topicComments.id })
    .from(topicComments)
    .innerJoin(topics, eq(topicComments.topicId, topics.id))
    .where(
      and(
        topicWhere,
        or(ne(topicComments.authorUserId, userId), isNull(topicComments.authorUserId)),
      ),
    )
    .limit(1);

  return !!foreign;
};
