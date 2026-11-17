import { powerMonitor } from 'electron';

/**
 * How often a signed-in device that is offline tries again. A live socket that
 * drops is the gateway client's job (its own backoff); this covers what that
 * backoff never retries — a launch while offline, a server config that failed
 * to load — so the device comes online without anyone toggling it.
 */
export const KEEP_CONNECTED_INTERVAL_MS = 30_000;

interface KeepConnectedDeps {
  /** The connection is down and nothing rules out retrying it automatically. */
  canAutoReconnect: () => boolean;
  connect: () => Promise<unknown>;
  /** A login exists to connect with. */
  isSignedIn: () => Promise<boolean>;
}

/**
 * Keeps this desktop connected to the device gateway whenever Lobot is running
 * and signed in: on launch, on a timer, and as soon as the machine wakes.
 */
export class GatewayKeepConnected {
  private active = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly deps: KeepConnectedDeps) {}

  /** Start keeping the device online, and try right away. */
  start() {
    this.active = true;
    if (!this.timer) {
      this.timer = setInterval(() => void this.ensure(), KEEP_CONNECTED_INTERVAL_MS);
      this.timer.unref?.();
      // A sleeping machine's socket is dead on wake; don't wait for the next tick.
      powerMonitor.on('resume', () => void this.ensure());
      powerMonitor.on('unlock-screen', () => void this.ensure());
    }
    void this.ensure();
  }

  /** An explicit disconnect pauses the retries until the next connect. */
  pause() {
    this.active = false;
  }

  resume() {
    this.active = true;
  }

  async ensure(): Promise<void> {
    if (!this.active || !this.deps.canAutoReconnect()) return;
    if (!(await this.deps.isSignedIn())) return;
    // Paused, or another path started connecting, while the login was read.
    if (!this.active || !this.deps.canAutoReconnect()) return;
    await this.deps.connect();
  }
}
