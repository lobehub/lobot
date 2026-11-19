import type { ChannelDetail, ChannelListItem, ChannelSection } from '@lobot/types';

import { createWorkspaceLambdaClient, lambdaClient } from '@/libs/trpc/client';

export interface ChannelAgentSelection {
  agentId: string;
  description?: string;
  deviceId?: string;
  name?: string;
  workingDirectory?: string;
}

/** The fields of a stored reply strategy this client edits; any others are written back as read. */
export type ChannelWakeConfig = Record<string, unknown> & {
  customInstructions?: string;
  customInstructionsEnabled?: boolean;
  duties?: Record<string, unknown> & { text?: string };
  enabled?: boolean;
  pace?: 'active' | 'balanced' | 'calm' | 'custom';
};

/** One message found by `searchMessages`, with a snippet around its first match. */
export interface ChannelSearchHit {
  author: { avatar: string | null; id: string | null; name: string | null; type: 'agent' | 'user' };
  createdAt: Date | string;
  id: string;
  sequence: number;
  snippet: string;
  threadId: string | null;
  threadTitle: string | null;
}

export interface ChannelSearchPage {
  hasMore: boolean;
  messages: ChannelSearchHit[];
}

export interface ChannelViewParams {
  before?: number;
  channelId: string;
  threadId?: string | null;
}

class ChannelService {
  archive = (channelId: string) => lambdaClient.channel.archive.mutate({ channelId });
  unarchive = (channelId: string) => lambdaClient.channel.unarchive.mutate({ channelId });
  archiveThread = (channelId: string, threadId: string) =>
    lambdaClient.channel.archiveThread.mutate({ channelId, threadId });
  unarchiveThread = (channelId: string, threadId: string) =>
    lambdaClient.channel.unarchiveThread.mutate({ channelId, threadId });
  agentEnvironment = async (channelId: string, memberId: string) =>
    (await lambdaClient.channel.agentEnvironment.query({ channelId, memberId })).data;
  updateAgentEnvironment = (
    channelId: string,
    memberId: string,
    environment: Pick<ChannelAgentSelection, 'deviceId' | 'workingDirectory'>,
  ) => lambdaClient.channel.updateAgentEnvironment.mutate({ channelId, environment, memberId });
  wakeConfig = async (channelId: string) =>
    (await lambdaClient.channel.wakeConfig.query({ channelId })).data;
  /** Replaces the Channel's whole reply strategy; `null` returns it to the defaults. */
  updateWakeConfig = (channelId: string, wake: ChannelWakeConfig | null) =>
    lambdaClient.channel.updateWakeConfig.mutate({ channelId, wake });
  editMessage = (channelId: string, messageId: string, content: string) =>
    lambdaClient.channel.editMessage.mutate({ channelId, content, messageId });
  deleteMessage = (channelId: string, messageId: string) =>
    lambdaClient.channel.deleteMessage.mutate({ channelId, messageId });
  /** Opens a workspace group Channel to the whole workspace, or makes it invite-only again. */
  updateVisibility = (channelId: string, visibility: 'private' | 'public') =>
    lambdaClient.channel.updateVisibility.mutate({ channelId, visibility });
  /** Messages in the Channel and its Threads containing every word of `query`, newest first. */
  searchMessages = async (
    channelId: string,
    query: string,
    before?: number,
  ): Promise<ChannelSearchPage> =>
    (await lambdaClient.channel.searchMessages.query({ before, channelId, query })).data;
  rename = (channelId: string, title: string) =>
    lambdaClient.channel.rename.mutate({ channelId, title });
  addUser = (channelId: string, userId: string) =>
    lambdaClient.channel.addUser.mutate({ channelId, userId });
  /** Without a Channel, the people a new Channel in the active workspace can start with. */
  userCandidates = async (
    channelId: string | undefined,
    search: string,
  ): Promise<ChannelPersonOption[]> =>
    (await lambdaClient.channel.userCandidates.query({ channelId, search })).data;
  /** In a project Channel, `joinProject` adds an Agent from outside to the project first. */
  addAgent = (channelId: string, agent: ChannelAgentSelection, joinProject?: boolean) =>
    lambdaClient.channel.addAgent.mutate({ agent, channelId, joinProject });
  removeMember = (channelId: string, memberId: string) =>
    lambdaClient.channel.removeMember.mutate({ channelId, memberId });
  setMemberMuted = (channelId: string, memberId: string, muted: boolean) =>
    lambdaClient.channel.setMemberMuted.mutate({ channelId, memberId, muted });
  create = (input: {
    agents: ChannelAgentSelection[];
    /** Seats Agents from outside the project in the project first. */
    joinProject?: boolean;
    projectId?: string;
    title: string;
    userIds?: string[];
  }) => lambdaClient.channel.create.mutate(input);
  createGroupFromDirect = (input: {
    agents: ChannelAgentSelection[];
    channelId: string;
    title: string;
    userIds: string[];
  }) => lambdaClient.channel.createGroupFromDirect.mutate(input);
  /** The caller's direct Channel with an Agent, opened if missing; null when it cannot answer there. */
  openDirect = async (input: { agentId: string }) =>
    (await lambdaClient.channel.openDirect.mutate(input)).data;
  /** The direct conversation with another person's Agent, from its share id, handle or link. */
  openShared = async (share: string) =>
    (await lambdaClient.channel.openShared.mutate({ share })).data;
  /** The caller's personal conversation with a contact, opened if missing. */
  openPeer = async (userId: string) =>
    (await lambdaClient.channel.openPeer.mutate({ userId })).data;
  detail = async (params: ChannelViewParams): Promise<ChannelDetail> =>
    (await lambdaClient.channel.detail.query(params)).data;
  /** A Channel page in a scope other than the active one; `null` is the personal space. */
  detailInScope = async (
    workspaceId: string | null,
    params: ChannelViewParams,
  ): Promise<ChannelDetail> =>
    (await createWorkspaceLambdaClient(workspaceId).channel.detail.query(params)).data;
  list = async (): Promise<ChannelListItem[]> => (await lambdaClient.channel.list.query()).data;
  /** The Channel list of a scope other than the active one; `null` is the personal space. */
  listInScope = async (workspaceId: string | null): Promise<ChannelListItem[]> =>
    (await createWorkspaceLambdaClient(workspaceId).channel.list.query()).data;
  markRead = (channelId: string, sequence: number) =>
    lambdaClient.channel.markRead.mutate({ channelId, sequence });
  setPinned = (channelId: string, pinned: boolean) =>
    lambdaClient.channel.setPinned.mutate({ channelId, pinned });

  /** Files the conversation under one of the caller's own sections; null takes it out. */
  moveToSection = (channelId: string, sectionId: string | null) =>
    lambdaClient.channel.moveToSection.mutate({ channelId, sectionId });
  /** The caller's own sections in the active scope, in list order. */
  listSections = async (): Promise<ChannelSection[]> =>
    (await lambdaClient.channel.listSections.query()).data;
  createSection = async (name: string): Promise<ChannelSection> =>
    (await lambdaClient.channel.createSection.mutate({ name })).data;
  updateSection = (id: string, value: { collapsed?: boolean; name?: string }) =>
    lambdaClient.channel.updateSection.mutate({ id, value });
  reorderSections = (ids: string[]) => lambdaClient.channel.reorderSections.mutate({ ids });
  /** Its conversations go back to the unsectioned part of the list. */
  removeSection = (id: string) => lambdaClient.channel.removeSection.mutate({ id });

  setMuted = (channelId: string, muted: boolean) =>
    lambdaClient.channel.setMuted.mutate({ channelId, muted });
  remove = (channelId: string) => lambdaClient.channel.remove.mutate({ channelId });
  removeThread = (channelId: string, threadId: string) =>
    lambdaClient.channel.removeThread.mutate({ channelId, threadId });
  /** Queues a reply that could not reach its device again; it waits for the device if offline. */
  retryJob = (channelId: string, jobId: string) =>
    lambdaClient.channel.retryJob.mutate({ channelId, jobId });
  /** Continues a failed reply in the same Agent session, where `retryJob` starts a new topic. */
  resumeJob = (channelId: string, jobId: string) =>
    lambdaClient.channel.resumeJob.mutate({ channelId, jobId });
  send = (input: {
    channelId: string;
    content: string;
    fileIds?: string[];
    mentions: string[];
    requestKey: string;
    replyToId?: string;
    rootMessageId?: string;
    threadId?: string | null;
  }) => lambdaClient.channel.send.mutate(input);
  stop = (channelId: string, scope: { jobId: string } | { threadId: string | null }) =>
    lambdaClient.channel.stop.mutate({ channelId, scope });
}

export const channelService = new ChannelService();

/** A workspace member who can still be invited into a Channel. */
export interface ChannelPersonOption {
  avatar: string | null;
  fullName: string | null;
  userId: string;
  username: string | null;
}
