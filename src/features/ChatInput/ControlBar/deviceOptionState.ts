import { isManagedCloudDevice, isWakeableManagedDevice } from '@lobot/types';

/** How a row that is not connected reads: asleep and waking are not offline. */
export type OfflineTone = 'offline' | 'sleeping' | 'waking';

/** Managed phases in which the device is already on its way up. */
const STARTING_PHASES = new Set(['pending', 'running', 'waking']);

interface DeviceOptionState {
  /** Locale key (namespace `chat`) for an offline row's status. */
  offlineLabelKey:
    | 'heteroAgent.executionTarget.offline'
    | 'heteroAgent.executionTarget.wakesWhenUsed'
    | 'heteroAgent.executionTarget.waking';
  /** Dot style for a row that is not connected. */
  offlineTone: OfflineTone;
  /** Locale key (namespace `chat`) for the row's reconnect or wake control. */
  reconnectLabelKey: 'heteroAgent.executionTarget.reconnect' | 'heteroAgent.executionTarget.wake';
  /** Whether the user may pick the row. */
  selectable: boolean;
  /** Whether the row shows its reconnect or wake control. */
  showReconnect: boolean;
}

/**
 * How one device row of the execution environment picker behaves.
 *
 * - An online device is selectable.
 * - A managed cloud device that sleeps is selectable too: a run bound to it
 *   wakes it before dispatch. It reads "Asleep · wakes when used" behind a
 *   hollow dot, and its control wakes it through the server. While it starts
 *   it reads "Waking…" and has no control to press again.
 * - Any other offline device is not selectable, and its control reconnects
 *   it through the desktop app.
 * - A managed device that cannot be woken (failed, deleting) has no control:
 *   the desktop app cannot reach it.
 */
export const getDeviceOptionState = (
  // Structural, so a `managedPhase` on the list row narrows it when present.
  device: Parameters<typeof isWakeableManagedDevice>[0],
  { presenceUnknown }: { presenceUnknown: boolean },
): DeviceOptionState => {
  const wakeable = isWakeableManagedDevice(device);
  const waking = wakeable && !!device.managedPhase && STARTING_PHASES.has(device.managedPhase);
  const offlineTone: OfflineTone = waking ? 'waking' : wakeable ? 'sleeping' : 'offline';

  return {
    offlineLabelKey: waking
      ? 'heteroAgent.executionTarget.waking'
      : wakeable
        ? 'heteroAgent.executionTarget.wakesWhenUsed'
        : 'heteroAgent.executionTarget.offline',
    offlineTone,
    reconnectLabelKey: wakeable
      ? 'heteroAgent.executionTarget.wake'
      : 'heteroAgent.executionTarget.reconnect',
    selectable: device.online || wakeable,
    showReconnect:
      !device.online && !presenceUnknown && !waking && (wakeable || !isManagedCloudDevice(device)),
  };
};
