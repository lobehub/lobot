import type { QuotaLimitReading, QuotaWindowProjection } from './types';
import { windowSecondsForKind } from './types';

/**
 * Anthropic reports a minute-aligned reset boundary with sub-second jitter.
 * Round to the provider-visible minute before using it as a persisted natural
 * key; truncating to seconds still splits one real window around :59.xxx / :00.xxx.
 */
const canonicalizeWindowResetAt = (resetsAt: number): number =>
  Math.round(resetsAt / 60_000) * 60_000;

const keyOf = (r: Pick<QuotaLimitReading, 'limitType' | 'scopeKey' | 'resetsAt'>): string =>
  JSON.stringify([r.limitType, r.scopeKey, r.resetsAt]);

/**
 * Fold a stream of readings into concrete windows keyed by
 * (limitType, scopeKey, resetsAt). `resetsAt` is the provider's own natural
 * key, so a window's start is simply `resetsAt - windowSeconds`.
 *
 * Utilization is monotonic within a window, so `peakUtilization` is robust to
 * missed samples — the ceiling is preserved even if the curve has gaps.
 */
export const projectWindows = (
  readings: QuotaLimitReading[],
  windowSecondsFor: (limitType: string) => number = windowSecondsForKind,
): QuotaWindowProjection[] => {
  const byWindow = new Map<string, QuotaWindowProjection>();

  for (const r of readings) {
    if (r.resetsAt == null) continue;
    const resetsAt = canonicalizeWindowResetAt(r.resetsAt);
    const windowSeconds =
      r.windowMinutes == null ? windowSecondsFor(r.limitType) : r.windowMinutes * 60;
    const key = keyOf({ ...r, resetsAt });
    const existing = byWindow.get(key);

    if (!existing) {
      byWindow.set(key, {
        firstSeenAt: r.capturedAt,
        lastSeenAt: r.capturedAt,
        lastUtilization: r.utilization,
        limitType: r.limitType,
        peakUtilization: r.utilization,
        rateLimitedAt: r.rateLimited ? r.capturedAt : null,
        resetsAt,
        scopeKey: r.scopeKey,
        windowSeconds,
        windowStartAt: resetsAt - windowSeconds * 1000,
      });
      continue;
    }

    existing.peakUtilization = Math.max(existing.peakUtilization, r.utilization);
    if (r.capturedAt >= existing.lastSeenAt) {
      existing.lastSeenAt = r.capturedAt;
      existing.lastUtilization = r.utilization;
    }
    if (r.capturedAt < existing.firstSeenAt) existing.firstSeenAt = r.capturedAt;
    if (
      r.rateLimited &&
      (existing.rateLimitedAt == null || r.capturedAt < existing.rateLimitedAt)
    ) {
      existing.rateLimitedAt = r.capturedAt;
    }
  }

  return [...byWindow.values()].sort((a, b) => a.resetsAt - b.resetsAt);
};
