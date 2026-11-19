import { BUILTIN_AGENT_SLUGS } from '@lobechat/const/builtinAgents';
import type {
  HeterogeneousAgentScanMap,
  HeterogeneousAgentType,
} from '@lobechat/heterogeneous-agents';
import type { SidebarAgentListResponse } from '@lobot/types';

import { homeService } from '@/services/home';
import { useAgentStore } from '@/store/agent';
import { scanLocalAgents } from '@/store/device/agentScan';
import { useGlobalStore } from '@/store/global';
import { useHomeStore } from '@/store/home';

import {
  buildConnectAgentConfig,
  CONNECTABLE_PROVIDERS,
  type ConnectableProvider,
} from './providers';

/**
 * Providers auto-discovery may import on its own. Platform agents (OpenClaw,
 * Hermes) need a device profile fetched first, so they stay in the wizard.
 */
export const DISCOVERABLE_PROVIDERS = CONNECTABLE_PROVIDERS.filter(
  (provider) => provider.kind !== 'platform',
);

export interface DiscoveredAgent {
  provider: ConnectableProvider;
  version?: string;
}

const scanDiscoverable = (): Promise<HeterogeneousAgentScanMap> =>
  scanLocalAgents(
    DISCOVERABLE_PROVIDERS.map((provider) => ({
      agentType: provider.type,
      command: provider.command ?? provider.type,
    })),
  );

const flattenAgentList = (list: SidebarAgentListResponse) => [
  ...list.pinned,
  ...list.groups.flatMap((g) => g.items),
  ...list.ungrouped,
  ...list.privatePinned,
  ...list.privateGroups.flatMap((g) => g.items),
  ...list.privateUngrouped,
];

const BUILTIN_SLUGS: ReadonlySet<string> = new Set<string>(Object.values(BUILTIN_AGENT_SLUGS));

/** Agent types the user already has, read from the server so it works before the sidebar loads. */
export const fetchImportedAgentTypes = async (): Promise<Set<string>> => {
  const list = await homeService.getSidebarAgentList();
  return new Set(
    flattenAgentList(list)
      .map((agent) => agent.heterogeneousType)
      .filter((type): type is string => !!type),
  );
};

export interface LocalAgentDiscovery {
  found: DiscoveredAgent[];
  /** The sidebar holds nothing but builtin agents (LobeAI), i.e. a brand-new user. */
  onlyBuiltin: boolean;
}

/**
 * Installed local agents that are neither imported yet nor in `skip` (types
 * already offered once, so a deleted or declined agent is not offered again).
 */
export const discoverLocalAgents = async (
  skip: readonly string[] = [],
): Promise<LocalAgentDiscovery> => {
  const [scan, list] = await Promise.all([scanDiscoverable(), homeService.getSidebarAgentList()]);
  const items = flattenAgentList(list);
  const imported = new Set(items.map((agent) => agent.heterogeneousType).filter(Boolean));
  const found = DISCOVERABLE_PROVIDERS.filter(
    (provider) =>
      scan[provider.type]?.available &&
      !imported.has(provider.type) &&
      !skip.includes(provider.type),
  ).map((provider) => ({ provider, version: scan[provider.type]?.version }));
  const onlyBuiltin = items.every((item) => !!item.slug && BUILTIN_SLUGS.has(item.slug));
  return { found, onlyBuiltin };
};

/**
 * Create one local agent per provider. Each agent gets its private Channel
 * from the create endpoint, so nothing else is needed here.
 */
export const importDiscoveredAgents = async (
  providers: ConnectableProvider[],
): Promise<HeterogeneousAgentType[]> => {
  const { createAgent } = useAgentStore.getState();
  const results = await Promise.allSettled(
    providers.map((provider) =>
      createAgent({ config: buildConnectAgentConfig({ provider, target: { kind: 'local' } }) }),
    ),
  );
  await useHomeStore.getState().refreshAgentList();

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) console.error('[AgentDiscovery] Some imports failed:', failed);

  return providers.filter((_, i) => results[i].status === 'fulfilled').map((p) => p.type);
};

/** Agent types auto-discovery has offered on this install. */
export const getDiscoveredAgentTypes = (): string[] =>
  useGlobalStore.getState().status.discoveredAgentTypes ?? [];

/** Remember offered types; appended so lodash `merge` in updateSystemStatus keeps the prefix. */
export const markAgentTypesDiscovered = (types: readonly string[]) => {
  const seen = getDiscoveredAgentTypes();
  const added = types.filter((type) => !seen.includes(type));
  if (added.length === 0) return;
  useGlobalStore
    .getState()
    .updateSystemStatus({ discoveredAgentTypes: [...seen, ...added] }, undefined, {
      skipWorkspaceOverlay: true,
    });
};
