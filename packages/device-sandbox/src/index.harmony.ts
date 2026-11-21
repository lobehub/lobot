/**
 * HarmonyOS build of `@lobechat/device-sandbox`.
 *
 * The real implementation pulls in `@anthropic-ai/sandbox-runtime` plus a
 * Windows helper-staging layer. On the OpenHarmony Electron port, evaluating
 * that graph aborts the main process natively (SIGABRT) while the module is
 * being loaded, and the whole feature is meaningless here anyway: the HAP
 * sandbox forbids spawning child processes, so there is nothing to sandbox.
 *
 * Every export keeps its original shape and simply reports "unavailable".
 */
export class SandboxError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'SandboxError';
    this.code = code;
  }
}

export const LOCAL_SANDBOX_NETWORK_DOMAINS: string[] = [];

const unavailableCapability = {
  available: false,
  backend: 'none',
  networkIsolation: false,
  reason: 'Device sandbox is not available on HarmonyOS: child processes are not supported.',
  warnings: [] as string[],
};

export const probeSandboxCapability = async (_options?: any): Promise<any> => unavailableCapability;

export const createSandboxEnv = (_options?: any): Record<string, string> => ({});

export const createSandboxLaunchPlan = (_options?: any): any => {
  throw new SandboxError('sandbox_unavailable', 'Device sandbox is not available on HarmonyOS.');
};

export const normalizeSandboxPolicy = (policy?: any): any => policy ?? {};
export const normalizeWritableRoots = (roots?: any): string[] => (Array.isArray(roots) ? roots : []);
export const createLocalSandboxPolicy = (_options?: any): any => ({
  network: { allowedDomains: [] },
  writableRoots: [],
});

export const createSrtConfig = (_options?: any): any => ({});

export const resolveSrtWinSource = (_fallback?: () => string): string | undefined => undefined;
export const resolveEffectiveSrtWin = (_options?: any): string | undefined => undefined;
export const ensureStagedSrtWin = async (_options?: any): Promise<string | undefined> => undefined;

export class SrtSandboxRuntime {
  async initialize(): Promise<void> {}
  async dispose(): Promise<void> {}
  async run(_plan?: any, _run?: any): Promise<any> {
    throw new SandboxError('sandbox_unavailable', 'Device sandbox is not available on HarmonyOS.');
  }
  get status(): any {
    return unavailableCapability;
  }
}

export const srtSandboxRuntime = new SrtSandboxRuntime();

export const canInstallSandbox = async (): Promise<boolean> => false;

export const installDeviceSandbox = async (): Promise<any> => ({
  status: 'unsupported',
  reason: 'Device sandbox is not available on HarmonyOS.',
});

export type SandboxBackend = any;
export type SandboxCapability = any;
export type SandboxCommand = any;
export type SandboxEnvironment = any;
export type SandboxErrorCode = any;
export type SandboxLaunchPlan = any;
export type SandboxPolicy = any;
export type SandboxSetupResult = any;
export type SandboxSetupStatus = any;
export type SandboxUnavailableBehavior = any;
export type CreateSandboxLaunchPlanOptions = any;
export type LocalSandboxPolicyOptions = any;
