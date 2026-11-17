type UnknownRecord = Record<PropertyKey, unknown>;

/** Checks for non-null, non-array objects, including class instances such as `Error`. */
export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
