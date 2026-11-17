import type { WorkVersionCumulativeUsage } from '@lobot/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getWorkVersionTotalTokens = (
  cumulativeUsage?: WorkVersionCumulativeUsage | null,
): number | null => {
  const usage = cumulativeUsage?.usage;
  if (!isRecord(usage) || !isRecord(usage.llm) || !isRecord(usage.llm.tokens)) return null;

  const total = usage.llm.tokens.total;
  return typeof total === 'number' && Number.isFinite(total) && total > 0 ? total : null;
};
