import { useEffect, useSyncExternalStore } from 'react';

import { getActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { canUseGatewayProtocolV2 } from '@/helpers/gatewayProtocol';
import type { ChannelViewParams } from '@/services/channel';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import {
  getGatewayMux,
  getGatewayMuxAvailabilityVersion,
  isGatewayMuxUnavailable,
  markGatewayMuxUnavailable,
  subscribeGatewayMuxAvailability,
} from '@/store/chat/slices/agentRun/actions/transports/gateway/muxRegistry';
import { useServerConfigStore } from '@/store/serverConfig';

import { refreshScopeChannelList } from './useScopeChannelList';

/** Public invalidations share the authenticated user socket, never an Agent's private stream. */
export const useChannelEvents = (params?: ChannelViewParams) => {
  const gatewayUrl = useServerConfigStore((s) => s.serverConfig.agentGatewayUrl);
  const enabled = useServerConfigStore((s) => s.serverConfig.agentGatewayProtocol === 2);
  const channelId = params?.channelId;
  const threadId = params?.threadId;
  const before = params?.before;
  // Re-subscribes once an unavailable verdict expires, so a socket lost while offline comes back.
  const availability = useSyncExternalStore(
    subscribeGatewayMuxAvailability,
    getGatewayMuxAvailabilityVersion,
  );
  useEffect(() => {
    if (!gatewayUrl || !enabled || !canUseGatewayProtocolV2()) return;
    const identity = { gatewayUrl };
    if (isGatewayMuxUnavailable(identity)) return;
    const mux = getGatewayMux(identity);
    const refresh = () => {
      void Promise.allSettled([
        channelActions.refreshList(),
        ...(channelId ? [channelActions.refreshDetail({ channelId, threadId, before })] : []),
      ]);
    };
    const remove = [
      mux.on('channel_changed', (event) => {
        if (!channelId || event.channelId === channelId) refresh();
        // From a workspace, a Channel the list lacks may be a personal conversation, whose
        // list the notifier watches apart.
        if (
          !channelId &&
          getActiveWorkspaceId() !== null &&
          !channelSelectors.list(useChannelStore.getState())?.some((c) => c.id === event.channelId)
        )
          refreshScopeChannelList(null);
      }),
      // Notifications are ephemeral: every reconnect reloads the durable view.
      mux.on('connected', refresh),
      mux.on('unavailable', () => markGatewayMuxUnavailable(identity)),
    ];
    mux.connect();
    return () => remove.forEach((unsubscribe) => unsubscribe());
  }, [availability, gatewayUrl, enabled, channelId, threadId, before]);
};
