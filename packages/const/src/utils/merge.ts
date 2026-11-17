import type { merge as _merge } from 'es-toolkit/compat';
import { mergeWith } from 'es-toolkit/compat';

/**
 * Used to merge objects. If it's an array, replace directly
 * @param target
 * @param source
 */
export const merge: typeof _merge = <T = object>(target: T, source: T) =>
  mergeWith({}, target, source, (obj, src) => {
    if (Array.isArray(obj)) return src;
  });
