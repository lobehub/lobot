import { messageMapKey } from '@/store/chat/utils/messageMapKey';

import { type ChatStoreState } from '../../initialState';
import { operationSelectors } from '../operation/selectors';

const gatewayFeed = (s: ChatStoreState) => s.gatewayFeed;

export const gatewayFeedSelectors = {
  gatewayFeed,
};

export const agentRunSelectors = {};
