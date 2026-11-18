import type { AgentAccountKind, AgentInboxMessage, AgentInboxMessageSummary } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';
import type { AgentAccountView } from '@/types/serverData';

interface ListAgentAccountsParams {
  agentId?: string;
  kind?: AgentAccountKind;
  provider?: string;
}

interface ProvisionAgentAccountParams {
  agentId: string;
  displayName?: string;
  /** Preferred local part for a mail address; the provider may ignore it. */
  prefix?: string;
  provider: string;
}

interface ListAgentInboxParams {
  accountId?: string;
  agentId: string;
  /** Keyset cursor: the last row of the previous page. */
  before?: { id: string; receivedAt: Date };
  limit?: number;
  unreadOnly?: boolean;
}

/** The inbox entry the server returns, whose lists may be missing on older rows. */
type InboxRow = Omit<AgentInboxMessage, 'attachments' | 'codes'> & {
  attachments?: AgentInboxMessage['attachments'] | null;
  codes?: AgentInboxMessage['codes'] | null;
};

/** The detail read, normalized at the boundary into the client's read model. */
const toInboxMessage = (row: InboxRow): AgentInboxMessage => ({
  accountId: row.accountId,
  agentId: row.agentId,
  // An attachment-only message would otherwise open with a blank body and no
  // trace of what was sent.
  attachments: row.attachments ?? [],
  codes: row.codes ?? [],
  createdAt: row.createdAt,
  from: row.from,
  id: row.id,
  preview: row.preview,
  readAt: row.readAt,
  receivedAt: row.receivedAt,
  sourceType: row.sourceType,
  subject: row.subject,
  text: row.text,
  threadKey: row.threadKey,
  to: row.to,
});

/**
 * Client for the agent-account control plane.
 *
 * Everything here maps 1:1 onto `agentAccount` tRPC procedures — no client-side
 * orchestration, no cached identity: the accounts and the inbox both change
 * outside this tab (a webhook delivers, another device releases), so a stale
 * local copy would be a lie rather than a convenience.
 */
class AgentAccountService {
  list = (params?: ListAgentAccountsParams): Promise<AgentAccountView[]> =>
    lambdaClient.agentAccount.list.query(params);

  // --------------- Inbox ---------------

  /** A page of summaries; the body and attachments come from {@link getInboxMessage}. */
  listInbox = (params: ListAgentInboxParams): Promise<AgentInboxMessageSummary[]> =>
    lambdaClient.agentAccount.inbox.list.query(params);

  /** Unread across the whole inbox, not just the page a list happened to load. */
  getInboxUnreadCount = async (agentId: string, accountId?: string): Promise<number> =>
    (await lambdaClient.agentAccount.inbox.unreadCount.query({ accountId, agentId })).unreadCount;

  getInboxMessage = async (id: string): Promise<AgentInboxMessage> =>
    toInboxMessage(await lambdaClient.agentAccount.inbox.get.query({ id }));

  markInboxRead = (ids: string[]) => lambdaClient.agentAccount.inbox.markRead.mutate({ ids });
}

export const agentAccountService = new AgentAccountService();
