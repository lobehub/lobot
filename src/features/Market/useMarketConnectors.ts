'use client';

import { getConnectorCatalog } from '@lobechat/const';
import { useMemo } from 'react';

import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useToolStore } from '@/store/tool';
import { ComposioServerStatus } from '@/store/tool/slices/composioStore';
import { LobehubSkillStatus } from '@/store/tool/slices/lobehubSkillStore/types';

import { type MarketConnector, toMarketConnector } from './catalog';

/**
 * Every connector this server offers, plus the ids the user has connected.
 * Mounting it syncs both connection lists (LobeHub Market and Composio).
 */
export const useMarketConnectors = () => {
  const lobehub = useServerConfigStore(serverConfigSelectors.enableLobehubSkill);
  const composio = useServerConfigStore(serverConfigSelectors.enableComposio);
  const useFetchLobehub = useToolStore((s) => s.useFetchLobehubSkillConnections);
  const useFetchComposio = useToolStore((s) => s.useFetchUserComposioConnections);
  useFetchLobehub(lobehub);
  useFetchComposio(composio);

  const lobehubServers = useToolStore((s) => s.lobehubSkillServers);
  const composioServers = useToolStore((s) => s.composioServers);

  const connectors = useMemo<MarketConnector[]>(
    () => getConnectorCatalog({ composio, lobehub }).map(toMarketConnector),
    [composio, lobehub],
  );

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const server of lobehubServers ?? [])
      if (server.status === LobehubSkillStatus.CONNECTED) ids.add(server.identifier);
    for (const server of composioServers ?? [])
      if (server.status === ComposioServerStatus.ACTIVE) ids.add(server.identifier);
    return ids;
  }, [composioServers, lobehubServers]);

  return { connectedIds, connectors };
};
