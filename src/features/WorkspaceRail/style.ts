import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

export const RAIL_AVATAR_SIZE = 32;
/** The square avatar's own corner, `size / 6`, so the create button matches the tiles. */
export const RAIL_TILE_RADIUS = RAIL_AVATAR_SIZE / 6;

// Discord-style server rail: a column of scope avatars left of the wrap, on the
// window background, with a pill on the left edge marking the active scope.
export const styles = stylex.create({
  add: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${RAIL_AVATAR_SIZE}px`,
    height: `${RAIL_AVATAR_SIZE}px`,
    borderRadius: `${RAIL_TILE_RADIUS}px`,
    color: {
      default: cssVar.colorTextTertiary,
      [stylex.when.ancestor(':hover')]: cssVar.colorText,
    },
    backgroundColor: {
      default: cssVar.colorFillTertiary,
      [stylex.when.ancestor(':hover')]: cssVar.colorFillSecondary,
    },
    transition: 'color 0.15s, background-color 0.15s',
  },
  divider: {
    flex: 'none',
    width: '20px',
    height: '2px',
    marginBlock: '2px',
    borderRadius: '1px',
    backgroundColor: cssVar.colorBorderSecondary,
  },
  item: {
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flex: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: `${RAIL_AVATAR_SIZE}px`,
  },
  // Discord's cue: a dot on hover, a tall pill on the active scope. Two marks rather than one
  // squashed with scaleY, which flattened the rounded end; at rest neither is scaled.
  dot: {
    pointerEvents: 'none',
    position: 'absolute',
    insetInlineStart: 0,
    width: '4px',
    height: '8px',
    borderStartEndRadius: '4px',
    borderEndEndRadius: '4px',
    backgroundColor: cssVar.colorText,
    opacity: { default: 0, [stylex.when.ancestor(':hover')]: 1 },
    transform: { default: 'scale(0)', [stylex.when.ancestor(':hover')]: 'scale(1)' },
    transformOrigin: 'left center',
    transition: 'opacity 0.15s, transform 0.15s',
  },
  pill: {
    pointerEvents: 'none',
    position: 'absolute',
    insetInlineStart: 0,
    width: '4px',
    height: '24px',
    borderStartEndRadius: '4px',
    borderEndEndRadius: '4px',
    backgroundColor: cssVar.colorText,
    transform: 'scaleY(0)',
    transition: 'transform 0.15s',
  },
  pillActive: {
    transform: 'scaleY(1)',
  },
  rail: {
    userSelect: 'none',
    overflowX: 'hidden',
    overflowY: 'auto',
    flex: 'none',
    alignItems: 'center',
    // Keep in sync with RAIL_WIDTH (./railHint), which the boot skeleton reserves.
    width: '48px',
    // The wrap keeps an 8px inset on every side; beside the rail that inset is the rail's own
    // right gap, so pull it in or the tiles sit 8px from the window edge but 16px from the wrap.
    marginInlineEnd: '-8px',
    // The Electron title bar sits above, so only the bottom matches the wrap's 8px inset.
    paddingBlockEnd: '8px',
    scrollbarWidth: 'none',
  },
  // Discord's unread badge: on the tile's bottom-right corner, cut out of the tile by a ring of
  // the window background. It hangs 4px below the tile into the 8px gap (the last scope sits above
  // the create button, and the rail's bottom padding covers the end), never above the first tile,
  // which the scrolling rail would clip.
  unread: {
    pointerEvents: 'none',
    position: 'absolute',
    insetBlockEnd: '-4px',
    // The tile is centered in the 48px item, so its corner sits 8px in; overhang it by 4px.
    insetInlineEnd: '4px',
    minWidth: '18px',
    height: '18px',
    // Border-box: 18 − 2×3 ring − 2×2 padding leaves 8px, wide enough for one digit, so a single
    // count stays a circle; at 4px padding it stretched to 20×18.
    paddingInline: '2px',
    borderWidth: '3px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgLayout,
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 600,
    lineHeight: '12px',
    color: cssVar.colorTextLightSolid,
    textAlign: 'center',
    backgroundColor: cssVar.colorError,
  },
});
