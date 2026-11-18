import { isDesktop } from '@lobechat/const';

import { deviceSelectors, useDeviceStore } from '@/store/device';

/**
 * Whether this machine can actually run sandboxed commands.
 *
 * Asked instead of guessed: availability depends on host binaries and OS
 * configuration, not on the platform string, so a `process.platform` check in
 * the renderer would offer the option on hosts that cannot honour it.
 *
 * The verdict can change during a session — in one direction. The desktop's
 * cheap probe only checks that the backend is installed; parts of the fence are
 * exercised only when the first real process spawns, so a host can pass the
 * probe and still fail every command. The desktop downgrades itself when that
 * happens, which is why callers revalidate when they are about to show the
 * option rather than trusting the first answer forever.
 *
 * Web has no local machine to fence, so it never asks.
 */
export const useLocalSandboxCapability = () => {
  useDeviceStore((s) => s.useFetchLocalSandboxCapability)(isDesktop);
  const data = useDeviceStore(deviceSelectors.localSandboxCapability);
  const revalidate = useDeviceStore((s) => s.refreshLocalSandboxCapability);
  const setCapability = useDeviceStore((s) => s.setLocalSandboxCapability);

  return { data, revalidate, setCapability };
};
