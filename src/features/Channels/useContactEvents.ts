import { useEffect } from 'react';

import { useGatewayUserFeed } from '@/hooks/useGatewayUserFeed';
import {
  getGatewayMux,
  markGatewayMuxUnavailable,
} from '@/store/chat/slices/agentRun/actions/transports/gateway/muxRegistry';
import { contactActions } from '@/store/contact';

/**
 * Keeps the address book live from the gateway: LobeHub sends `user_changed` with topic
 * `contacts` to both people when a request is sent, answered or withdrawn, or a contact is added
 * or removed. Notices are ephemeral, so every reconnect re-reads it too.
 */
export const useContactEvents = () => {
  const gatewayUrl = useGatewayUserFeed();

  useEffect(() => {
    if (!gatewayUrl) return;
    const identity = { gatewayUrl };
    const mux = getGatewayMux(identity);
    const refresh = () => void contactActions.refreshAll();
    const remove = [
      mux.on('user_changed', (event) => {
        if (event.topic === 'contacts') refresh();
      }),
      mux.on('connected', refresh),
      mux.on('unavailable', () => markGatewayMuxUnavailable(identity)),
    ];
    mux.connect();
    return () => remove.forEach((unsubscribe) => unsubscribe());
  }, [gatewayUrl]);
};
