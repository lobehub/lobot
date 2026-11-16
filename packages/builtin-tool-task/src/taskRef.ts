/** Canonical identity for new results, with historical message fallbacks. */
export const resolveTaskOpenTarget = (
  state?: { taskId?: string; identifier?: string } | null,
  args?: { identifier?: string } | null,
): string | undefined => state?.taskId ?? state?.identifier ?? args?.identifier;
