import { useMemo } from 'react';

import { useSingleton } from '@/hooks/useSingleton';
import {
  getBrowser,
  getPlatform,
  isArc,
  isInStandaloneMode,
  isSonomaOrLaterSafari,
} from '@/utils/platform';

export const usePlatform = () => {
  const platform = useSingleton(getPlatform);
  const browser = useSingleton(getBrowser);

  // Read once: `isArc` calls getComputedStyle, which forces a style recalc of the whole page,
  // and this hook runs in the app layout on every route change.
  return useMemo(() => {
    const platformInfo = {
      isAndroid: platform?.toLowerCase() === 'android',
      isApple: platform && ['mac os', 'ios'].includes(platform?.toLowerCase()),
      isArc: isArc(),
      isChrome: browser?.toLowerCase() === 'chrome',
      isChromium: browser && ['chrome', 'edge', 'opera', 'brave'].includes(browser?.toLowerCase()),
      isEdge: browser?.toLowerCase() === 'edge',
      isFirefox: browser?.toLowerCase() === 'firefox',
      isIOS: platform?.toLowerCase() === 'ios',
      isMacOS: platform?.toLowerCase() === 'mac os',
      isPWA: isInStandaloneMode(),
      isSafari: browser?.toLowerCase() === 'safari',
      isSonomaOrLaterSafari: isSonomaOrLaterSafari(),
    };
    return {
      ...platformInfo,
      isSupportInstallPWA:
        !platformInfo.isArc &&
        !platformInfo.isFirefox &&
        ((platformInfo.isChromium && !platformInfo.isIOS) ||
          (platformInfo.isMacOS && platformInfo.isSonomaOrLaterSafari)),
    };
  }, []);
};
