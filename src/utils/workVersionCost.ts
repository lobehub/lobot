export const formatWorkVersionCost = (cost?: number | null): string | null => {
  // null/undefined means the cost is unknown (no snapshot recorded) — hide it.
  // A literal 0 is a known-zero spend (e.g. a same-operation version whose
  // cumulative snapshot didn't advance) and must render as $0.00, not blank.
  if (cost === null || cost === undefined || cost < 0) return null;

  if (cost > 0 && cost < 0.01) return `$${cost.toFixed(4)}`;

  return `$${cost.toFixed(2)}`;
};
