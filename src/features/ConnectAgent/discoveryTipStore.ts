import { create } from 'zustand';

import type { ConnectableProvider } from './providers';

interface DiscoveryTipState {
  /** Local agents found at launch, waiting for the user in the title bar tip. */
  providers: ConnectableProvider[];
}

export const useDiscoveryTipStore = create<DiscoveryTipState>(() => ({ providers: [] }));

export const showDiscoveryTip = (providers: ConnectableProvider[]) =>
  useDiscoveryTipStore.setState({ providers });

export const clearDiscoveryTip = () => useDiscoveryTipStore.setState({ providers: [] });
