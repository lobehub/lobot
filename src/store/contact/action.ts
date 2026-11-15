import type { ContactItem, ContactRequestItem } from '@lobechat/types';

import { createReplicaSlice, recordLens } from '@/libs/replica';
import { contactService, type ContactUserProfileData } from '@/services/contact';

import { contactListResource, contactProfileResource, contactRequestsResource } from './projection';
import { type ContactState, useContactStore } from './store';

const REQUESTS_REFRESH_MS = 60_000;

class ContactActionImpl {
  readonly #list = createReplicaSlice(contactListResource, {
    actionPrefix: 'contact/list',
    get: useContactStore.getState,
    set: useContactStore.setState,
    stateKey: 'listReplica',
    view: recordLens<ContactState, ContactItem[]>('listMap'),
  });
  readonly #requests = createReplicaSlice(contactRequestsResource, {
    actionPrefix: 'contact/requests',
    get: useContactStore.getState,
    set: useContactStore.setState,
    stateKey: 'requestsReplica',
    view: recordLens<ContactState, ContactRequestItem[]>('requestsMap'),
  });
  readonly #profile = createReplicaSlice(contactProfileResource, {
    actionPrefix: 'contact/profile',
    get: useContactStore.getState,
    set: useContactStore.setState,
    stateKey: 'profileReplica',
    view: recordLens<ContactState, ContactUserProfileData>('profileMap'),
  });

  useFetchList = (enabled = true) => this.#list.useSync({}, { enabled });
  /** No push yet: incoming requests are polled so the badge appears without a reload. */
  useFetchRequests = (enabled = true) =>
    this.#requests.useSync({}, { enabled, refreshInterval: REQUESTS_REFRESH_MS });
  useFetchProfile = (userId: string | undefined) =>
    this.#profile.useSync(userId ? { userId } : null);

  /** A committed write must not read as failed because its refresh did. */
  #refresh = async (profileUserId?: string) => {
    try {
      await Promise.all([
        this.#list.fetch({}, { fresh: true }),
        this.#requests.fetch({}, { fresh: true }),
        profileUserId ? this.#profile.fetch({ userId: profileUserId }, { fresh: true }) : undefined,
      ]);
    } catch (error) {
      console.error('Failed to refresh contacts after a write', error);
    }
  };

  sendRequest = async (userId: string, message?: string) => {
    const result = await contactService.sendRequest(userId, message);
    await this.#refresh(userId);
    return result;
  };
  acceptRequest = async (request: Pick<ContactRequestItem, 'id' | 'user'>) => {
    await contactService.acceptRequest(request.id);
    await this.#refresh(request.user.id);
  };
  declineRequest = async (request: Pick<ContactRequestItem, 'id' | 'user'>) => {
    await contactService.declineRequest(request.id);
    await this.#refresh(request.user.id);
  };
  cancelRequest = async (request: Pick<ContactRequestItem, 'id' | 'user'>) => {
    await contactService.cancelRequest(request.id);
    await this.#refresh(request.user.id);
  };
  removeUser = async (userId: string) => {
    await contactService.removeUser(userId);
    await this.#refresh(userId);
  };
  addAgent = async (share: string) => {
    const agent = await contactService.addAgent(share);
    await this.#refresh(agent.owner.id);
    return agent;
  };
  removeAgent = async (agentId: string) => {
    await contactService.removeAgent(agentId);
    await this.#refresh();
  };
}

export const contactActions = new ContactActionImpl();
