'use client';

import { confirmModal } from '@lobehub/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToolStore } from '@/store/tool';
import { ComposioServerStatus, composioStoreSelectors } from '@/store/tool/slices/composioStore';
import { lobehubSkillStoreSelectors } from '@/store/tool/slices/lobehubSkillStore/selectors';
import { LobehubSkillStatus } from '@/store/tool/slices/lobehubSkillStore/types';
import { toConnectorActionError } from '@/utils/connectorActionError';

import type { MarketConnector } from './catalog';

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 15_000;
const WINDOW_CHECK_MS = 500;

/** Whether the connector is connected, read from the store the catalog source owns. */
export const useConnectorConnected = (connector: MarketConnector) =>
  useToolStore((s) => {
    if (connector.source.type === 'lobehub')
      return (
        lobehubSkillStoreSelectors.getServerByIdentifier(connector.id)(s)?.status ===
        LobehubSkillStatus.CONNECTED
      );
    return (
      composioStoreSelectors.getServerByIdentifier(connector.id)(s)?.status ===
      ComposioServerStatus.ACTIVE
    );
  });

/**
 * Connect / disconnect one Market connector. Connecting opens the provider's
 * OAuth page in a popup and watches it: when the popup closes (or COOP hides
 * that from us) the status is polled for a while, and an authorization that
 * never completed is kept on the row as an error.
 */
export const useConnectorAuth = (connector: MarketConnector) => {
  const { t } = useTranslation('setting');
  const { id, label, source } = connector;
  const isLobehub = source.type === 'lobehub';
  const connected = useConnectorConnected(connector);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingAuth, setIsWaitingAuth] = useState(false);
  const windowCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkLobehubStatus = useToolStore((s) => s.checkLobehubSkillStatus);
  const getAuthorizeUrl = useToolStore((s) => s.getLobehubSkillAuthorizeUrl);
  const revokeLobehub = useToolStore((s) => s.revokeLobehubSkill);
  const setLobehubError = useToolStore((s) => s.setLobehubSkillError);
  const createComposio = useToolStore((s) => s.createComposioConnection);
  const reauthorizeComposio = useToolStore((s) => s.reauthorizeComposioConnection);
  const refreshComposio = useToolStore((s) => s.refreshComposioConnectionStatus);
  const removeComposio = useToolStore((s) => s.removeComposioConnection);
  const setComposioError = useToolStore((s) => s.setComposioServerError);
  const error = useToolStore((s) =>
    isLobehub
      ? lobehubSkillStoreSelectors.getServerError(id)(s)
      : composioStoreSelectors.getServerError(id)(s),
  );

  const setError = isLobehub ? setLobehubError : setComposioError;
  const refreshStatus = useCallback(async () => {
    if (isLobehub) await checkLobehubStatus(id);
    else await refreshComposio(id);
  }, [checkLobehubStatus, id, isLobehub, refreshComposio]);

  const stopWatching = useCallback(() => {
    if (windowCheckRef.current) clearInterval(windowCheckRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    windowCheckRef.current = null;
    pollRef.current = null;
    pollTimeoutRef.current = null;
    setIsWaitingAuth(false);
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  useEffect(() => {
    if (connected && isWaitingAuth) stopWatching();
  }, [connected, isWaitingAuth, stopWatching]);

  // The OAuth callback page posts back when it can reach this window.
  useEffect(() => {
    if (!isLobehub) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'LOBEHUB_SKILL_AUTH_SUCCESS' && event.data?.provider === id) {
        stopWatching();
        void checkLobehubStatus(id);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkLobehubStatus, id, isLobehub, stopWatching]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      refreshStatus().catch((error_) => console.info('[Market] Auth status poll:', error_));
    }, POLL_INTERVAL_MS);
    pollTimeoutRef.current = setTimeout(() => {
      stopWatching();
      // The popup is gone and nothing connected: say so on the row, the user
      // may not have noticed the popup failed.
      const state = useToolStore.getState();
      const stillOff = isLobehub
        ? lobehubSkillStoreSelectors.getServerByIdentifier(id)(state)?.status !==
          LobehubSkillStatus.CONNECTED
        : composioStoreSelectors.getServerByIdentifier(id)(state)?.status !==
          ComposioServerStatus.ACTIVE;
      if (stillOff) setError(id, { action: 'connect', code: 'AUTH_INCOMPLETE' });
    }, POLL_TIMEOUT_MS);
  }, [id, isLobehub, refreshStatus, setError, stopWatching]);

  const openOAuthWindow = useCallback(
    (url: string) => {
      stopWatching();
      setIsWaitingAuth(true);
      const popup = window.open(url, '_blank', 'width=600,height=700');
      if (!popup) {
        startPolling();
        return;
      }
      windowCheckRef.current = setInterval(() => {
        try {
          if (!popup.closed) return;
        } catch {
          // COOP blocks reading `closed`; polling still settles the status.
        }
        if (windowCheckRef.current) clearInterval(windowCheckRef.current);
        windowCheckRef.current = null;
        if (isLobehub) void refreshStatus();
        startPolling();
      }, WINDOW_CHECK_MS);
    },
    [isLobehub, refreshStatus, startPolling, stopWatching],
  );

  const connect = useCallback(async () => {
    if (connected || isConnecting) return;
    setIsConnecting(true);
    setError(id, undefined);
    try {
      if (source.type === 'lobehub') {
        // The desktop app (app://) has no http callback the system browser can reach.
        const redirectUri = window.location.protocol.startsWith('http')
          ? `${window.location.origin}/oauth/callback/success?provider=${encodeURIComponent(id)}`
          : undefined;
        const { authorizeUrl } = await getAuthorizeUrl(id, { redirectUri });
        openOAuthWindow(authorizeUrl);
        return;
      }

      const existing = composioStoreSelectors.getServerByIdentifier(id)(useToolStore.getState());
      const server = existing
        ? await reauthorizeComposio(id)
        : await createComposio({
            appSlug: source.serverType.appSlug,
            identifier: id,
            label,
          });
      if (server?.status === ComposioServerStatus.ACTIVE) await refreshComposio(id);
      else if (server?.redirectUrl) openOAuthWindow(server.redirectUrl);
    } catch (error_) {
      console.error('[Market] Failed to connect:', error_);
      setError(id, toConnectorActionError('connect', error_));
    } finally {
      setIsConnecting(false);
    }
  }, [
    connected,
    createComposio,
    getAuthorizeUrl,
    id,
    isConnecting,
    label,
    openOAuthWindow,
    reauthorizeComposio,
    refreshComposio,
    setError,
    source,
  ]);

  const disconnect = useCallback(() => {
    confirmModal({
      cancelText: t('cancel', { ns: 'common' }),
      content: t('tools.lobehubSkill.disconnectConfirm.desc', { name: label }),
      okButtonProps: { danger: true },
      okText: t('tools.lobehubSkill.disconnect'),
      onOk: async () => {
        if (isLobehub) await revokeLobehub(id);
        else await removeComposio(id);
      },
      title: t('tools.lobehubSkill.disconnectConfirm.title', { name: label }),
    });
  }, [id, isLobehub, label, removeComposio, revokeLobehub, t]);

  return {
    connect,
    connected,
    disconnect,
    error,
    pending: isConnecting || isWaitingAuth,
  };
};
