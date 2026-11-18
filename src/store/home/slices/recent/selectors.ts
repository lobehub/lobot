import { type HomeStore } from '@/store/home/store';

import { type RecentEntityRef, toRecentEntityRef } from './initialState';

/** Items of one recents query; `undefined` until it is hydrated or fetched. */
const query = (queryKey: string) => (s: HomeStore) => s.recentListMap[queryKey];

/** Latest topics per owner for the IM conversation list. */
const conversationRecents = (queryKey: string) => (s: HomeStore) =>
  s.conversationRecentMap[queryKey];

const item = (queryKey: string, ref: RecentEntityRef) => (s: HomeStore) =>
  s.recentListMap[queryKey]?.find((recent) => toRecentEntityRef(recent) === ref);

export const homeRecentSelectors = {
  conversationRecents,
  item,
  query,
};
