import type {
  ContactAgentProfile,
  ContactItem,
  ContactRelation,
  ContactRequestItem,
  ContactSearchResult,
  ContactUserProfile,
} from '@lobechat/types';

import { lambdaClient } from '@/libs/trpc/client';

export interface ContactUserProfileData {
  relation: ContactRelation;
  /** Agents the person shares by link; only listed to their contacts. */
  sharedAgents: ContactAgentProfile[];
  user: ContactUserProfile;
}

/** The personal address book: mutual contacts, their requests, and other people's shared Agents. */
class ContactService {
  list = (): Promise<ContactItem[]> => lambdaClient.contact.list.query();
  listRequests = (): Promise<ContactRequestItem[]> => lambdaClient.contact.listRequests.query();
  /** Exact lookup of a username, `@handle`, share handle or pasted share link. */
  search = (query: string): Promise<ContactSearchResult[]> =>
    lambdaClient.contact.search.query({ query });
  userProfile = (userId: string): Promise<ContactUserProfileData> =>
    lambdaClient.contact.userProfile.query({ userId });

  sendRequest = (userId: string, message?: string) =>
    lambdaClient.contact.sendRequest.mutate({ message, userId });
  acceptRequest = (requestId: string) => lambdaClient.contact.acceptRequest.mutate({ requestId });
  declineRequest = (requestId: string) => lambdaClient.contact.declineRequest.mutate({ requestId });
  cancelRequest = (requestId: string) => lambdaClient.contact.cancelRequest.mutate({ requestId });
  removeUser = (userId: string) => lambdaClient.contact.removeUser.mutate({ userId });

  /** Add another person's Agent by its share id, handle or link. */
  addAgent = (share: string): Promise<ContactAgentProfile> =>
    lambdaClient.contact.addAgent.mutate({ share });
  removeAgent = (agentId: string) => lambdaClient.contact.removeAgent.mutate({ agentId });
}

export const contactService = new ContactService();
