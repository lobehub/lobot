import type { ChannelMemberConfig } from '@lobot/types';
import { agentDisplayName } from '@lobot/types';
import { cleanObject } from '@lobechat/utils';
import { and, eq } from 'drizzle-orm';

import type { ChannelItem, ChannelMemberItem } from '../../schemas';
import { agents, channelMembers } from '../../schemas';
import type { Transaction } from '../../type';
import { agentUsableByWhere } from '../../utils/agent-access';
import { normalizeInboxAgentTitle } from '../../utils/inboxAgent';
import { ChannelError } from './error';

/** Explicitly select environment fields so legacy or untyped copies cannot override an Agent. */
export const memberEnvironment = (config?: ChannelMemberConfig | null): ChannelMemberConfig =>
  cleanObject({
    deviceId: config?.deviceId,
    deviceOwnerId: config?.deviceOwnerId,
    workingDirectory: config?.workingDirectory,
  });

export interface ChannelAddAgentInput {
  agentId: string;
  config?: ChannelMemberConfig;
  /** Optional Channel-specific routing description and identity label. */
  description?: string;
  name?: string;
}

/** Check Agent scope and hold it through creation of the Channel/member reference. */
export const requireChannelAgent = async (
  tx: Transaction,
  workspaceId: string | null,
  userId: string,
  agentId: string,
) => {
  const [agent] = await tx
    .select({ name: agents.name, slug: agents.slug, title: agents.title })
    .from(agents)
    .where(agentUsableByWhere(agentId, { userId, workspaceId: workspaceId ?? undefined }))
    .for('share');
  if (!agent) throw new ChannelError('NOT_FOUND', 'Agent not found');
  // LobeAI rows are stored without a title; label it the way the rest of the product does.
  return { name: agent.name, title: normalizeInboxAgentTitle(agent.title, agent) };
};

/** Called under the Channel lock after the caller's admin role has been checked. */
export const addAgentMember = async (
  tx: Transaction,
  channel: ChannelItem,
  userId: string,
  input: ChannelAddAgentInput,
): Promise<ChannelMemberItem> => {
  if (channel.agentId) {
    if (input.agentId !== channel.agentId)
      throw new ChannelError('BAD_REQUEST', 'A direct conversation is bound to one Agent');
    const [existing] = await tx
      .select({ id: channelMembers.id })
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channel.id), eq(channelMembers.actorType, 'agent')));
    if (existing)
      throw new ChannelError('CONFLICT', 'The direct conversation already has its Agent');
  }
  if (!input.agentId.trim())
    throw new ChannelError('BAD_REQUEST', 'An Agent reference is required');
  const agent = await requireChannelAgent(tx, channel.workspaceId, userId, input.agentId);
  // Idempotent per Agent: retrying a partly applied batch must not add a second member that
  // answers the same requests again.
  const [joined] = await tx
    .select()
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channel.id),
        eq(channelMembers.agentId, input.agentId),
        eq(channelMembers.status, 'active'),
      ),
    )
    .limit(1);
  if (joined) return joined;
  const [member] = await tx
    .insert(channelMembers)
    .values({
      actorType: 'agent',
      agentId: input.agentId,
      channelId: channel.id,
      config: memberEnvironment(input.config),
      description: input.description,
      name: input.name?.trim() || agentDisplayName(agent, 'Agent'),
    })
    .returning();
  return member;
};

/** An active Agent member of this Channel; people and departed Agents have no environment. */
export const requireAgentMember = async (tx: Transaction, channelId: string, memberId: string) => {
  const [member] = await tx
    .select()
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.id, memberId),
        eq(channelMembers.actorType, 'agent'),
        eq(channelMembers.status, 'active'),
      ),
    )
    .limit(1);
  if (!member?.agentId) throw new ChannelError('NOT_FOUND', 'Agent member not found');
  return member as ChannelMemberItem & { agentId: string };
};
