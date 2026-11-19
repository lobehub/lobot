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
import { showDiscoveryTip } from './discoveryTipStore';

/** Let boot-time fetches settle before probing a dozen CLIs. */
const LAUNCH_SCAN_DELAY = 5000;

let scannedThisSession = false;

/**
 * Once per launch, look for agent CLIs installed since the last offer. A new
 * user (sidebar holds only LobeAI) gets them imported straight away; anyone
 * else gets a tip in the title bar. An offered type (imported or ignored) is remembered and
 * never offered again on this install.
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
      let discovery;
      try {
        discovery = await discoverLocalAgents(getDiscoveredAgentTypes());
      } catch (error) {
        console.error('[AgentDiscovery] Launch scan failed:', error);
        return;
      }
      const { found, onlyBuiltin } = discovery;
      if (found.length === 0) return;

      const providers = found.map((agent) => agent.provider);

      // A new user with only LobeAI has nothing to protect: put the local
      // agents straight into the sidebar. Anyone else gets a title bar tip.
      if (onlyBuiltin) {
        markAgentTypesDiscovered(providers.map((provider) => provider.type));
        await importDiscoveredAgents(providers);
        return;
      }

      showDiscoveryTip(providers);
    }, LAUNCH_SCAN_DELAY);

    return () => clearTimeout(timer);
  }, [isLogin, isStatusInit]);
};
