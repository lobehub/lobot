import { type ChatStoreState } from '../../initialState';

const gatewayFeed = (s: ChatStoreState) => s.gatewayFeed;

export const gatewayFeedSelectors = {
  gatewayFeed,
};
