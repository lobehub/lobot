import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

import { sectionHeaderMarker } from './markers.stylex';

/** A pointer that can hover. A touch screen keeps the fold arrow in the header. */
const HOVER = '@media (hover: hover)';

export const AVATAR_SIZE = 32;

/** Circle shared by the list column's icon buttons: search, new chat, contacts. */
export const COLUMN_ACTION_ICON_SIZE = {
  blockSize: AVATAR_SIZE,
  borderRadius: '50%',
  size: 18,
};
/**
 * One pin is large, two sit between that and three, and four or more use the list avatar.
 */
export type PinnedTile = 'solo' | 'pair' | 'compact' | 'dense';

export const pinnedTile = (count: number): PinnedTile =>
  count <= 1 ? 'solo' : count === 2 ? 'pair' : count === 3 ? 'compact' : 'dense';

export const pinnedAvatarSize = (tile: PinnedTile) =>
  tile === 'solo' ? 60 : tile === 'pair' ? 52 : tile === 'compact' ? 44 : AVATAR_SIZE;

/** The most pinned conversations the grid holds when the person lists more as rows. */
export const PINNED_TILE_LIMIT = 6;

/** Whether the pinned conversations list as rows instead of the avatar grid. */
export const pinnedAsRows = (layout: 'tiles' | 'rows', count: number) =>
  layout === 'rows' && count > PINNED_TILE_LIMIT;

/** Row avatars stay small; a pinned tile uses the size for how many are pinned. */
export const conversationAvatarSize = (variant: 'row' | 'tile' | undefined, tile?: PinnedTile) =>
  variant === 'tile' ? pinnedAvatarSize(tile ?? 'compact') : AVATAR_SIZE;

export const styles = stylex.create({
  /** Elevated fill behind the column's outlined circle buttons. */
  columnActionIcon: {
    backgroundColor: cssVar.colorBgElevated,
  },
  avatar: {
    position: 'relative',
    display: 'inline-flex',
    flex: 'none',
  },
  /** Marks a project avatar as one of that project's Channels. */
  channelMark: {
    position: 'absolute',
    insetBlockEnd: '-3px',
    insetInlineEnd: '-3px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '4px',
    backgroundColor: cssVar.colorBgElevated,
  },
  empty: {
    paddingBlock: '8px',
    paddingInline: '10px',
    fontSize: '12px',
    color: cssVar.colorTextQuaternary,
  },
  /** The network lookup row's picture: a filled square the size of an avatar, like WeChat's. */
  networkSearchIcon: {
    display: 'inline-flex',
    flex: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: cssVar.borderRadius,
    color: cssVar.colorTextLightSolid,
    backgroundColor: cssVar.colorPrimary,
  },
  /** The query under "Find contacts online", in the accent so it reads as what gets searched. */
  networkSearchQuery: {
    color: cssVar.colorPrimary,
  },
  networkSearchText: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  /** Pinned conversations sit as a centered row of square tiles. */
  pinnedGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    columnGap: '4px',
    rowGap: '4px',
    paddingBlockStart: '4px',
    paddingBlockEnd: '16px',
  },
  /** Many pinned conversations as rows: one tinted block atop the list, like WeChat's. */
  pinnedRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBlockEnd: '8px',
    borderRadius: cssVar.borderRadiusLG,
    backgroundColor: cssVar.colorFillQuaternary,
  },
  /** Four or more sit closer together, so each name can keep a little inset. */
  pinnedGroupDense: {
    columnGap: '2px',
  },
  /** Where a dragged conversation can land: the pinned tiles, or a group. */
  dropOver: {
    borderRadius: cssVar.borderRadiusLG,
    backgroundColor: cssVar.colorFillTertiary,
  },
  /** Shown only while dragging, when that landing spot is not already on screen. */
  dropSlot: {
    minHeight: '72px',
    borderRadius: cssVar.borderRadiusLG,
    backgroundColor: cssVar.colorFillQuaternary,
  },
  /** The rows under no section, so a drop can cover them as one target. */
  dropStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    borderRadius: cssVar.borderRadiusLG,
  },
  /** The conversation following the pointer. */
  dragGhost: {
    display: 'inline-flex',
    borderRadius: cssVar.borderRadiusLG,
    backgroundColor: cssVar.colorBgElevated,
  },
  /** The row left behind while its ghost follows the pointer. */
  dragging: {
    opacity: 0.35,
  },
  /** "[@me]" before the preview; the unread badge's red, so the two read as one signal. */
  mentioned: {
    flex: 'none',
    fontSize: '12px',
    lineHeight: '16px',
    color: cssVar.colorError,
  },
  /** The muted bell at the end of the preview line; as quiet as the timestamp. */
  mutedIcon: {
    flex: 'none',
    marginInlineStart: 'auto',
    color: cssVar.colorTextQuaternary,
  },
  preview: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: '1',
    fontSize: '12px',
    lineHeight: '16px',
    color: cssVar.colorTextTertiary,
  },
  row: {
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    paddingBlock: '8px',
    paddingInline: '8px',
    borderRadius: cssVar.borderRadiusLG,
    color: { 'default': cssVar.colorText, ':hover': cssVar.colorText },
    textDecoration: 'none',
    backgroundColor: { 'default': null, ':hover': cssVar.colorFillTertiary },
    transition: 'background-color 0.15s',
  },
  rowActive: {
    backgroundColor: { 'default': cssVar.colorFillSecondary, ':hover': cssVar.colorFillSecondary },
  },
  /** Title plus preview line, so a row without a preview keeps the same height. */
  rowText: {
    minWidth: 0,
    minHeight: '36px',
  },
  rowTextSingleLine: {
    minHeight: 0,
  },
  /** One of the person's own sections: its header, then its rows. */
  section: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBlockStart: '6px',
  },
  /** Sits at the end of the header, and stays out of the way until the header is pointed at. */
  sectionChevron: {
    flex: 'none',
    opacity: {
      default: 1,
      [HOVER]: {
        default: 0,
        [stylex.when.ancestor(':hover', sectionHeaderMarker)]: 1,
        [stylex.when.ancestor(':focus-visible', sectionHeaderMarker)]: 1,
      },
    },
    transitionProperty: 'opacity, transform',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease',
  },
  sectionChevronOpen: {
    transform: 'rotate(90deg)',
  },
  /** Quiet like a list caption; the whole line folds the section and drags it. */
  sectionHeader: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    width: '100%',
    height: '26px',
    paddingInline: '8px',
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: cssVar.borderRadius,
    fontSize: '12px',
    fontWeight: 500,
    color: {
      'default': cssVar.colorTextTertiary,
      ':hover': cssVar.colorTextSecondary,
    },
    textAlign: 'start',
    backgroundColor: {
      'default': 'transparent',
      ':hover': cssVar.colorFillTertiary,
    },
    cursor: 'pointer',
  },
  sectionName: {
    overflow: 'hidden',
    flex: '1',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  /** A folded section's unread count, as quiet as the caption so it does not compete with rows. */
  sectionUnread: {
    flex: 'none',
    fontSize: '11px',
    color: cssVar.colorTextSecondary,
  },
  tag: {
    marginInlineStart: '6px',
    fontSize: '11px',
    fontWeight: 400,
    color: cssVar.colorTextQuaternary,
  },
  /** Three pinned conversations: a small tile, so they still fit on a row. */
  tile: {
    boxSizing: 'border-box',
    cursor: 'pointer',
    userSelect: 'none',

    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
    justifyContent: 'center',

    width: 68,
    height: 80,
    paddingBlock: '6px',
    paddingInline: '4px',
    borderRadius: cssVar.borderRadiusLG,

    color: cssVar.colorText,
    textDecoration: 'none',

    backgroundColor: { 'default': null, ':hover': cssVar.colorFillTertiary },
    transition: 'background-color 0.15s',
  },
  /**
   * Four or more: the list avatar, narrow enough that four fit the panel's minimum width
   * (240, minus the list's 6px inset on each side).
   */
  tileDense: {
    width: 54,
    height: 60,
    gap: '4px',
    paddingBlock: '4px',
    paddingInline: '4px',
  },
  /** Two pinned conversations: halfway between the single square and the small tile. */
  tilePair: {
    width: 80,
    height: 86,
    gap: '4px',
    paddingBlockStart: '8px',
    paddingBlockEnd: '6px',
    paddingInline: '6px',
  },
  /** The only pinned conversation: a square, with a short gap under the name. */
  tileSolo: {
    width: 92,
    height: 92,
    gap: '4px',
    paddingBlockStart: '8px',
    paddingBlockEnd: '4px',
    paddingInline: '8px',
  },
  tileActive: {
    backgroundColor: { 'default': cssVar.colorFillSecondary, ':hover': cssVar.colorFillSecondary },
  },
  tileTitle: {
    overflow: 'hidden',
    width: '100%',

    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '16px',
    color: cssVar.colorText,
    textAlign: 'center',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  time: {
    flex: 'none',
    fontSize: '11px',
    lineHeight: '18px',
    color: cssVar.colorTextQuaternary,
    opacity: 0.65,
  },
  title: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: '1',
    fontSize: '13px',
    fontWeight: 500,
    lineHeight: '18px',
  },
  /** Same quiet colour as the preview it replaces, so a reply in progress does not shout. */
  typing: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  unread: {
    pointerEvents: 'none',
    position: 'absolute',
    insetBlockStart: '-5px',
    insetInlineEnd: '-6px',
    minWidth: '16px',
    height: '16px',
    // Border-box: 16 − 2×1.5 ring − 2×2 padding leaves 9px for one digit, so a single count stays
    // a circle instead of a 17×16 oval.
    paddingInline: '2px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 600,
    lineHeight: '13px',
    color: cssVar.colorTextLightSolid,
    textAlign: 'center',
    backgroundColor: cssVar.colorError,
  },
  /** A muted conversation's unread messages: a dot instead of a count, like WeChat. */
  unreadDot: {
    pointerEvents: 'none',
    position: 'absolute',
    insetBlockStart: '-3px',
    insetInlineEnd: '-3px',
    width: '10px',
    height: '10px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '999px',
    backgroundColor: cssVar.colorError,
  },
});
