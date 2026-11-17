import type { PtySessionManager as NativePtySessionManager } from './index';

type PtySessionApi = Pick<
  NativePtySessionManager,
  'create' | 'has' | 'kill' | 'killAll' | 'resize' | 'write'
>;

/**
 * HarmonyOS build: `@lydell/node-pty` has no HarmonyOS binary, and the store
 * sandbox gives an app no shell to spawn. Importing the native module at all
 * would fail while the controllers load, so this variant never touches it and
 * refuses to open a session instead.
 */
export class PtySessionManager implements PtySessionApi {
  constructor(_callbacks: ConstructorParameters<typeof NativePtySessionManager>[0]) {}

  async create(): ReturnType<PtySessionApi['create']> {
    throw new Error('The terminal is not available on HarmonyOS');
  }

  write(): void {}

  resize(): void {}

  kill(): void {}

  has(): boolean {
    return false;
  }

  killAll(): void {}
}
