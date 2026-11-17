import { useSyncExternalStore } from 'react';

import { canUseGatewayProtocolV2 } from '@/helpers/gatewayProtocol';
import {
  getGatewayMuxAvailabilityVersion,
  isGatewayMuxUnavailable,
  subscribeGatewayMuxAvailability,
} from '@/store/chat/slices/agentRun/actions/transports/gateway/muxRegistry';
import { useServerConfigStore } from '@/store/serverConfig';

/**
 * The gateway URL when this client can receive the gateway's user feed (`channel_changed`,
 * `user_changed`), else undefined. Turns undefined while the socket is marked unavailable and
 * back once that verdict expires, so callers can fall back to polling in between.
 */
export const useGatewayUserFeed = (): string | undefined => {
  const gatewayUrl = useServerConfigStore((s) => s.serverConfig.agentGatewayUrl);
  const enabled = useServerConfigStore((s) => s.serverConfig.agentGatewayProtocol === 2);
  // Re-renders when an unavailable verdict is set or expires.
  useSyncExternalStore(subscribeGatewayMuxAvailability, getGatewayMuxAvailabilityVersion);
  if (!gatewayUrl || !enabled || !canUseGatewayProtocolV2()) return undefined;
  return isGatewayMuxUnavailable({ gatewayUrl }) ? undefined : gatewayUrl;
};
