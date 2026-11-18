import type { DeviceMetricPoint, DeviceMetricSeries } from '@lobot/types';

/**
 * What the device was doing during one bucket:
 * - `online` — running and connected to LobeHub.
 * - `offline` — running (it took samples) but not connected: a network or
 *   gateway problem rather than a machine problem.
 * - `missing` — no samples: the machine was asleep / off, or LobeHub was not
 *   running on it.
 * - `pending` — the most recent buckets, whose samples may simply not have
 *   been uploaded yet.
 */
type HealthSlotStatus = 'online' | 'offline' | 'missing' | 'pending';

/** CPU / memory / load, each as a percentage (load relative to the core count). */
export interface HealthUsage {
  cpuPercent: number | null;
  loadPercent: number | null;
  memoryPercent: number | null;
}

/**
 * The newest reading: the charted metrics plus the disk, which moves too
 * slowly to chart or to color the strip but still answers "is it filling up?".
 */
export interface LatestUsage extends HealthUsage {
  diskPercent: number | null;
}

export interface HealthSlot extends HealthUsage {
  memoryUsedBytes: number | null;
  start: number;
  status: HealthSlotStatus;
}

interface HealthTimeline {
  /** Newest reading of each metric, for the chart headers and the row preview. */
  latest: LatestUsage | null;
  /** Upper bound for the load chart — at least 100%, so an overloaded machine still fits. */
  loadCeiling: number;
  slots: HealthSlot[];
}

/**
 * Devices upload every few minutes, so the tail of the window is expected to
 * be empty for a while; only call it missing once it is older than this.
 */
export const UPLOAD_GRACE_MS = 10 * 60_000;

/** Load average as a share of the machine's cores; null without both. */
export const loadPercentOf = (load1: number | null | undefined, cpuCount: number | null) =>
  load1 === null || load1 === undefined || !cpuCount ? null : (load1 / cpuCount) * 100;

export const buildHealthTimeline = (series: DeviceMetricSeries): HealthTimeline => {
  const { bucketMs, cpuCount, from, points, to } = series;
  const byStart = new Map(points.map((p) => [p.observedAt, p]));
  const firstStart = Math.floor(from / bucketMs) * bucketMs;

  const slots: HealthSlot[] = [];
  for (let start = firstStart; start <= to; start += bucketMs) {
    const point = byStart.get(start);
    const status: HealthSlotStatus = point
      ? point.connected
        ? 'online'
        : 'offline'
      : start + bucketMs > to - UPLOAD_GRACE_MS
        ? 'pending'
        : 'missing';
    slots.push({
      cpuPercent: point?.cpuPercent ?? null,
      loadPercent: loadPercentOf(point?.load1, cpuCount),
      memoryPercent: point?.memoryPercent ?? null,
      memoryUsedBytes: point?.memoryUsedBytes ?? null,
      start,
      status,
    });
  }

  const newest: DeviceMetricPoint | undefined = points.at(-1);
  const maxLoad = Math.max(0, ...slots.map((s) => s.loadPercent ?? 0));

  return {
    latest: newest
      ? {
          cpuPercent: newest.cpuPercent,
          // A series cached before devices reported the disk has no such field.
          diskPercent: newest.diskPercent ?? null,
          loadPercent: loadPercentOf(newest.load1, cpuCount),
          memoryPercent: newest.memoryPercent,
        }
      : null,
    loadCeiling: Math.max(100, Math.ceil(maxLoad)),
    slots,
  };
};
