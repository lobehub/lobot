import { toast } from '@lobehub/ui';
import { t } from 'i18next';
import { useEffect } from 'react';

import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import {
  discoverLocalAgents,
  getDiscoveredAgentTypes,
  importDiscoveredAgents,
  markAgentTypesDiscovered,
} from './discovery';

/** Let boot-time fetches settle before probing a dozen CLIs. */
const LAUNCH_SCAN_DELAY = 5000;

let scannedThisSession = false;

/**
 * Once per launch, look for agent CLIs installed since the last offer and ask
 * before importing them. Nothing is created without a click; an offered type
 * (imported or ignored) is remembered and never offered again on this install.
 */
export const useLaunchAgentDiscovery = () => {
  const isLogin = useUserStore(authSelectors.isLogin);
  const isStatusInit = useGlobalStore((s) => s.isStatusInit);

  useEffect(() => {
    if (scannedThisSession || !isLogin || !isStatusInit) return;
    // Onboarding has its own discovery screen. Main only boots into the app once
    // onboarding is done (its flag lives in the main store, not this renderer), so
    // being off the onboarding route is the signal.
    if (location.pathname.includes('desktop-onboarding')) return;

    const timer = setTimeout(async () => {
      if (scannedThisSession) return;
      scannedThisSession = true;
      let found;
      try {
        found = await discoverLocalAgents(getDiscoveredAgentTypes());
      } catch (error) {
        console.error('[AgentDiscovery] Launch scan failed:', error);
        return;
      }
      if (found.length === 0) return;

      const providers = found.map((agent) => agent.provider);
      const types = providers.map((provider) => provider.type);
      const names = providers.map((provider) => provider.title).join(', ');

      const instance = toast.info({
        actions: [
          {
            label: t('connectAgent.discovery.ignore', { ns: 'chat' }),
            onClick: () => {
              markAgentTypesDiscovered(types);
              instance.close();
            },
            variant: 'text',
          },
          {
            label: t('connectAgent.discovery.import', { ns: 'chat' }),
            onClick: async () => {
              instance.close();
              markAgentTypesDiscovered(types);
              const imported = await importDiscoveredAgents(providers);
              if (imported.length > 0) {
                toast.success(
                  t('connectAgent.create.doneTitleMany', { ns: 'chat', total: imported.length }),
                );
              }
            },
            variant: 'primary',
          },
        ],
        description: t('connectAgent.discovery.description', { ns: 'chat' }),
        duration: 20_000,
        id: 'launch-agent-discovery',
        title: t('connectAgent.discovery.title', { names, ns: 'chat' }),
      });
    }, LAUNCH_SCAN_DELAY);

    return () => clearTimeout(timer);
  }, [isLogin, isStatusInit]);
};
