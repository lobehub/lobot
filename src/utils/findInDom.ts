/**
 * Literal find over rendered text, painted through the CSS Custom Highlight
 * API: a highlight range owns no DOM, so it survives views that re-render
 * underneath it (virtualized lists, streaming rows, rich-text editors) and is
 * simply rebuilt from what is on screen.
 */

/**
 * Asks whatever clamps a range (a "show more" preview) to open up when the
 * range is cut off. Dispatched by find when it lands on a match; a clamp
 * listens on its own root, so hosts need no wiring. `detail` is the range's
 * on-screen box, so the clamp can tell a clipped match from a visible one.
 */
export const REVEAL_IN_PAGE_EVENT = 'lobe:reveal-in-page';

export type RevealInPageEvent = CustomEvent<{ bottom: number; top: number }>;
