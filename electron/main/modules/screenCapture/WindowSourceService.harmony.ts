import type { ScreenCaptureWindowInfo } from '@lobechat/electron-client-ipc';

/**
 * HarmonyOS build: `node-screenshots` and `get-windows` have no HarmonyOS
 * binaries, so there are no other windows to list.
 */
export async function enumerateWindows(): Promise<ScreenCaptureWindowInfo[]> {
  return [];
}

export function findWindowById(): undefined {
  return undefined;
}
