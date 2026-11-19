import type { Plugin } from 'vite';

/**
 * HarmonyOS PC answers the pointer-capability media queries wrong.
 *
 * `(hover: hover)` describes the *primary* input, and the port reports its
 * touchscreen as primary even while a mouse and touchpad are attached. Every
 * hover-revealed control then falls back to its touch layout — most visibly,
 * the message toolbar sits open on every row instead of appearing when pointed
 * at, which is what the desktop build does.
 *
 * A media query cannot be overridden from a stylesheet, and StyleX resolves the
 * query as a literal at build time, so the rules have to be *emitted*
 * differently for this build rather than masked at runtime: hover styling
 * always applies, and the no-hover fallbacks never do.
 */
export function harmonyHoverMedia(): Plugin {
  return {
    enforce: 'pre',
    name: 'harmony-hover-media',
    transform(code, id) {
      const file = id.split('?')[0];
      if (!file.includes('/src/') || !/\.(ts|tsx)$/.test(file)) return null;
      if (!code.includes('(hover:')) return null;

      return {
        code: code
          .replaceAll('@media (hover: hover)', '@media (min-width: 0px)')
          .replaceAll('@media (hover: none)', '@media (min-width: 99999px)'),
        map: null,
      };
    },
  };
}
