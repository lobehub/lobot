import type { DeviceScope } from '@lobot/types';
import { cssVar } from '@lobehub/ui';

import { deviceSelectors, useDeviceStore } from '@/store/device';

import { type UsageLevel } from './format';

/**
 * The device's health series, from the device store's replica. The list-row
 * preview, the hover panel, the composer chip and the detail panel read the
 * same entry, so opening a device reuses the preview's data, and a revisit
 * charts the persisted copy before the server answers. `scope` is the list
 * item's, so a deviceId enrolled both personally and in the workspace reads
 * the row it was listed as. `enabled: false` (an off-screen row) stops
 * fetching; the stored series stays.
 */
export const useDeviceMetricSeries = (
  deviceId: string,
  scope: DeviceScope | undefined,
  enabled = true,
) => {
  const params = { deviceId, scope };
  const { error, isValidating, revalidate } = useDeviceStore((s) => s.useFetchDeviceMetricSeries)(
    params,
    enabled && !!deviceId,
  );
  const data = useDeviceStore(deviceSelectors.getMetricSeries(params));
  return { data, error, isValidating, mutate: revalidate };
};

export const USAGE_COLOR: Record<UsageLevel, string> = {
  critical: cssVar.colorError,
  high: cssVar.colorWarning,
  normal: cssVar.colorSuccess,
};

/** Text color for a reading — the same green / yellow / red as the strip; no reading keeps the default. */
export const usageTextColor = (level: UsageLevel | undefined) =>
  level ? USAGE_COLOR[level] : undefined;
