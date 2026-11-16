type UnknownRecord = Record<PropertyKey, unknown>;

/**
 * Checks for any non-null object, including arrays.
 *
 * Prefer `isRecord` for normal object maps. Use this only when unknown object-shaped payloads
 * must be preserved instead of being classified as empty or invalid.
 */
const isObjectLike = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

/**
 * Checks for non-null, non-array objects.
 *
 * This intentionally accepts class instances, `Error`, `Date`, and null-prototype objects. Use
 * `isPlainRecord` when prototype-strict plain object semantics are required.
 */
const isRecord = (value: unknown): value is UnknownRecord =>
  isObjectLike(value) && !Array.isArray(value);

export const isPlainRecord = (value: unknown): value is UnknownRecord => {
  if (!isRecord(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;
