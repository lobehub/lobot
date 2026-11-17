/**
 * HarmonyOS build: `node-screenshots` has no HarmonyOS binary. Callers already
 * treat `null` as "capture failed".
 */
export async function captureWindow(): Promise<Buffer | null> {
  return null;
}

export async function captureRect(): Promise<Buffer | null> {
  return null;
}
