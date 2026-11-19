import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

export const AVATAR_SIZE = 32;
/** Pinned tiles use a card-sized avatar over the compact row one. */
export const PINNED_AVATAR_SIZE = 56;

export const styles = stylex.create({
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
    columnGap: '8px',
    rowGap: '8px',
    paddingBlock: '16px',
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
  /** Sets the unsectioned rows apart from the last section above them. */
  restDivider: {
    height: '1px',
    marginBlockStart: '6px',
    marginBlockEnd: '4px',
    marginInline: '8px',
    backgroundColor: cssVar.colorBorderSecondary,
  },
  /** One of the person's own sections: its header, then its rows. */
  section: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBlockStart: '6px',
  },
  sectionChevron: {
    flex: 'none',
    transition: 'transform 150ms ease',
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
  /** A pinned conversation: a square that holds the avatar and the name. */
  tile: {
    boxSizing: 'border-box',
    cursor: 'pointer',
    userSelect: 'none',

    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
    justifyContent: 'center',

    width: 96,
    height: 96,
    paddingBlock: '8px',
    paddingInline: '8px',
    borderRadius: cssVar.borderRadiusLG,

    color: cssVar.colorText,
    textDecoration: 'none',

    backgroundColor: { 'default': null, ':hover': cssVar.colorFillTertiary },
    transition: 'background-color 0.15s',
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
    color: cssVar.colorTextSecondary,
    textAlign: 'center',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tileTitleActive: {
    color: cssVar.colorText,
    fontWeight: 600,
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
    paddingInline: '4px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 600,
    lineHeight: '13px',
    color: '#fff',
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
