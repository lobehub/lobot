import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

import { mentionTokens } from '@/styles/mention.stylex';

import { headerHoverMarker } from './markers.stylex';

const HOVER = '@media (hover: hover)';

export const styles = stylex.create({
  /** A failed reply's body: its reason and a retry, on one line. */
  replyFailure: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  /** The server's diagnostic can run long; it gives way first, whole on hover. */
  replyFailureReason: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: cssVar.colorTextSecondary,
  },
  layout: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    color: cssVar.colorText,
    backgroundColor: cssVar.colorBgContainer,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: '1',
    minWidth: 0,
    minHeight: 0,
  },
  conversations: {
    position: 'relative',
    overflow: 'hidden',
    flex: '1',
    minWidth: 0,
    minHeight: 0,
  },
  /** The channel column. Its header sits beside a docked thread, not above it. */
  channelColumn: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: '1',
    minWidth: 0,
    minHeight: 0,
  },
  threadPanel: {
    zIndex: 10,
    flexShrink: 0,
    height: '100%',
    backgroundColor: cssVar.colorBgContainer,
  },
  threadContent: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  // The Channel half of a thread page's `# Channel › thread` title, leading back to the Channel.
  crumb: {
    display: 'flex',
    flexShrink: 0,
    gap: 8,
    alignItems: 'center',
    maxWidth: 200,
    minWidth: 0,
    marginBlock: 0,
    marginInline: 0,
    paddingBlock: 2,
    paddingInline: 4,
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 6,
    font: 'inherit',
    backgroundColor: {
      default: 'transparent',
      [HOVER]: { 'default': 'transparent', ':hover': cssVar.colorFillTertiary },
    },
    cursor: 'pointer',
  },
  // The open thread's title takes the room the Channel crumb leaves, and gives way first.
  threadCrumb: {
    flexShrink: 1,
    gap: 6,
    maxWidth: 'none',
  },
  // Interaction feedback only: never change the original title's box or background.
  headerTitleInteractive: {
    cursor: 'pointer',
    textDecorationLine: 'none',
    outline: { 'default': null, ':focus-visible': `2px solid ${cssVar.colorTextDescription}` },
    outlineOffset: 2,
  },
  threadHeader: {
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: cssVar.colorBorderSecondary,
  },
  /**
   * A header action shown on hover: the title's "more" button, the thread's "open as page". It
   * leaves the row until the header is hovered or focused, and stays while its menu is open. A touch screen has no hover, so the button stays in the row.
   */
  headerMenu: {
    display: 'flex',
    flex: 'none',
    position: {
      default: 'static',
      [HOVER]: {
        'default': 'absolute',
        ':is([data-menu-open])': 'static',
        [stylex.when.ancestor(':hover', headerHoverMarker)]: 'static',
        [stylex.when.ancestor(':focus-within', headerHoverMarker)]: 'static',
      },
    },
    opacity: {
      default: 1,
      [HOVER]: {
        'default': 0,
        ':is([data-menu-open])': 1,
        [stylex.when.ancestor(':hover', headerHoverMarker)]: 1,
        [stylex.when.ancestor(':focus-within', headerHoverMarker)]: 1,
      },
    },
    pointerEvents: {
      default: 'auto',
      [HOVER]: {
        'default': 'none',
        ':is([data-menu-open])': 'auto',
        [stylex.when.ancestor(':hover', headerHoverMarker)]: 'auto',
        [stylex.when.ancestor(':focus-within', headerHoverMarker)]: 'auto',
      },
    },
  },
  feed: {
    overflowY: 'auto',
    flex: '1',
    minHeight: 0,
    // With the first row's own 6px, room for its toolbar, which floats above the row.
    paddingBlockStart: 10,
    paddingBlockEnd: 16,
  },
  /** Holds the scrolling feed so the jump-to-bottom button can float over its foot. */
  feedFrame: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: 0,
  },
  jumpToBottom: {
    position: 'absolute',
    zIndex: 5,
    insetBlockEnd: 12,
    insetInlineStart: '50%',
    transform: 'translateX(-50%)',
  },
  /** Unread @mentions of the viewer, pinned to the feed's top corner like an IM's. */
  jumpToMention: {
    position: 'absolute',
    zIndex: 5,
    insetBlockStart: 12,
    insetInlineEnd: 16,
    color: cssVar.colorPrimary,
    boxShadow: cssVar.boxShadowSecondary,
  },
  /**
   * One message row; hovering highlights it and reveals its toolbar, like a chat app.
   * The wash spans the feed edge to edge (cancelling the feed's 16px padding), square,
   * so it reads as a list row rather than a floating card.
   */
  messageRow: {
    position: 'relative',
    marginInline: -16,
    paddingInline: 16,
    backgroundColor: {
      default: 'transparent',
      [HOVER]: { 'default': 'transparent', ':hover': cssVar.colorFillQuaternary },
    },
  },
  /**
   * A message that shows its author opens a group: with the 2px under the previous message
   * and its own 8px, 16px between authors against 4px between one author's messages.
   */
  groupStart: {
    paddingBlockStart: 6,
  },
  /** Someone mentioned you: a pale yellow row with a gold bar down its left edge. */
  mentionedMessage: {
    backgroundColor: cssVar.colorWarningBg,
    boxShadow: `inset 3px 0 0 ${cssVar.colorWarning}`,
  },
  highlightedMessage: { backgroundColor: cssVar.colorInfoBg },
  /** A message still on its way shows faded instead of carrying a status line. */
  pendingMessage: { opacity: 0.6 },
  messageAvatar: {
    position: 'absolute',
    insetBlockStart: 8,
    insetInlineStart: 0,
  },
  /**
   * The message this one answers, sitting above the avatar. The curve drops from its
   * middle to the top of the avatar, which is 8px into the row below.
   */
  replyQuote: {
    'position': 'relative',
    'display': 'flex',
    'alignItems': 'center',
    'maxWidth': 'calc(100% - 48px)',
    'marginBlockStart': 8,
    'marginInlineStart': 48,
    'padding': 0,
    'borderWidth': 0,
    'backgroundColor': 'transparent',
    'font': 'inherit',
    'gap': 6,
    'fontSize': 13,
    'lineHeight': '20px',
    'color': {
      'default': cssVar.colorTextSecondary,
      ':disabled': cssVar.colorTextSecondary,
      [HOVER]: { 'default': cssVar.colorTextSecondary, ':hover': cssVar.colorText },
    },
    'textAlign': 'start',
    'cursor': { 'default': 'pointer', ':disabled': 'default' },
    '::before': {
      pointerEvents: 'none',
      content: '""',
      position: 'absolute',
      // Avatar center (18) sits 48px left of this text.
      insetInlineStart: -30,
      insetBlockStart: '50%',
      insetBlockEnd: -8,
      width: 22,
      boxSizing: 'border-box',
      borderInlineStartWidth: 2,
      borderInlineStartStyle: 'solid',
      borderInlineStartColor: cssVar.colorBorderSecondary,
      borderBlockStartWidth: 2,
      borderBlockStartStyle: 'solid',
      borderBlockStartColor: cssVar.colorBorderSecondary,
      borderStartStartRadius: 8,
    },
  },
  replyQuoteFace: {
    display: 'inline-flex',
    flexShrink: 0,
  },
  replyQuoteText: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  /** A continuation has no avatar; the curve still drops into the gutter beside the text. */
  replyQuoteCompact: {
    '::before': { insetBlockEnd: -12 },
  },
  /** The elbow drawn inside the measured box: down the gutter, then across to the card. */
  threadSpine: {
    display: 'block',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    borderInlineStartWidth: 2,
    borderInlineStartStyle: 'solid',
    borderInlineStartColor: cssVar.colorBorderSecondary,
    borderBlockEndWidth: 2,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: cssVar.colorBorderSecondary,
    borderEndStartRadius: 8,
  },
  /**
   * Cancels the 4px the markdown keeps above its first paragraph and below its last: inside a
   * message they only pad the author name and the next message apart.
   */
  messageMarkdown: {
    marginBlock: -4,
  },
  /** "(edited)" under a message's text: a quiet note, like its time. */
  messageEdited: {
    alignSelf: 'flex-start',
    marginBlockStart: -4,
    fontSize: cssVar.fontSizeSM,
    color: cssVar.colorTextTertiary,
  },
  messageTime: {
    flexShrink: 0,
    fontSize: cssVar.fontSizeSM,
    fontVariantNumeric: 'tabular-nums',
    // One step below the author name, which is one step below the message.
    color: cssVar.colorTextTertiary,
    whiteSpace: 'nowrap',
    opacity: 1,
  },
  continuationTime: {
    position: 'absolute',
    insetBlockStart: 0,
    insetInlineStart: 4,
    width: 54,
    textAlign: 'center',
    opacity: {
      default: 1,
      [HOVER]: {
        default: 0,
        [stylex.when.ancestor(':hover')]: 1,
        [stylex.when.ancestor(':focus-within')]: 1,
      },
    },
  },
  /** A plain centered date; a rule on each side read heavier than the messages it separates. */
  dateDivider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // 16px each side once the messages' own 2px and 14px are added.
    paddingBlockStart: 14,
    paddingBlockEnd: 2,
    fontSize: cssVar.fontSizeSM,
    color: cssVar.colorTextSecondary,
  },
  /** Above the first message that was unread when the conversation opened: a thin line, 「新」 in its middle. */
  newDivider: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    paddingBlockStart: 14,
    paddingBlockEnd: 2,
    fontSize: cssVar.fontSizeSM,
    fontWeight: 500,
    lineHeight: 1,
    color: cssVar.colorInfo,
  },
  newDividerLine: {
    flex: '1',
    height: 1,
    backgroundColor: cssVar.colorInfo,
    opacity: 0.5,
  },
  /** Floats over the row's top-right corner while the row is hovered or focused. */
  /** A member row's "more" button: shown on row hover or focus where hover exists. */
  memberIdentity: {
    display: 'flex',
    flex: '1',
    gap: 8,
    alignItems: 'center',
    minWidth: 0,
    cursor: 'default',
  },
  /** The selectable part of a roster row: the whole line except its menu button. */
  memberSelect: {
    cursor: 'pointer',
    borderRadius: cssVar.borderRadius,
  },
  /** Hover and selection fill the row, inset from the panel padding like a chat roster. */
  memberRow: {
    marginInline: -8,
    paddingInline: 8,
    borderRadius: cssVar.borderRadius,
    backgroundColor: {
      'default': 'transparent',
      ':hover': cssVar.colorFillTertiary,
    },
  },
  memberRowSelected: {
    backgroundColor: {
      'default': cssVar.colorFillSecondary,
      ':hover': cssVar.colorFillSecondary,
    },
  },
  memberAvatarTrigger: {
    display: 'inline-flex',
    flex: 'none',
    cursor: 'pointer',
  },
  memberActions: {
    flex: 'none',
    opacity: {
      default: 1,
      [HOVER]: {
        default: 0,
        [stylex.when.ancestor(':hover')]: 1,
        [stylex.when.ancestor(':focus-within')]: 1,
      },
    },
  },
  /**
   * Pinned to the row's top right for every message, yours included, and lifted over the
   * row's top edge so it never covers the message, like Slack's.
   */
  messageToolbar: {
    position: 'absolute',
    insetBlockStart: -14,
    insetInlineEnd: 16,
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    padding: 2,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: cssVar.colorBorderSecondary,
    borderRadius: cssVar.borderRadius,
    backgroundColor: cssVar.colorBgElevated,
    boxShadow: cssVar.boxShadowTertiary,
    opacity: {
      default: 1,
      [HOVER]: {
        default: 0,
        [stylex.when.ancestor(':hover')]: 1,
        [stylex.when.ancestor(':focus-within')]: 1,
      },
    },
    pointerEvents: {
      default: 'auto',
      [HOVER]: {
        default: 'none',
        [stylex.when.ancestor(':hover')]: 'auto',
        [stylex.when.ancestor(':focus-within')]: 'auto',
      },
    },
  },
  /** Inline system line in the timeline, such as who joined. */
  event: {
    paddingBlockStart: 10,
    paddingBlockEnd: 2,
    // Starts where the welcome header and the avatars do, not indented to the message text.
    paddingInlineStart: 4,
    fontSize: cssVar.fontSizeSM,
    lineHeight: 1.8,
    color: cssVar.colorTextSecondary,
  },
  eventMember: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    marginInline: 2,
    verticalAlign: 'baseline',
  },
  /** Opens a profile card on hover: a pointer and a light tint say so. */
  eventMemberHoverable: {
    cursor: 'pointer',
    marginInline: 0,
    paddingInline: 2,
    borderRadius: 4,
    backgroundColor: { 'default': null, ':hover': cssVar.colorFillSecondary },
    transition: 'background-color 0.15s',
  },
  eventMemberName: {
    // Let the name supply the inline flex baseline instead of the avatar.
    alignSelf: 'baseline',
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  /** A mentioned member inside message text; blue-violet so it never reads as a link. */
  mention: {
    paddingBlock: 1,
    paddingInline: 4,
    borderRadius: 4,
    fontWeight: 500,
    color: mentionTokens.color,
    backgroundColor: mentionTokens.bg,
  },
  /** A mention of a known member opens their profile card on hover. */
  mentionHoverable: {
    cursor: 'pointer',
    backgroundColor: { 'default': mentionTokens.bg, ':hover': mentionTokens.bgHover },
    transition: 'background-color 0.15s',
  },
  /** A `<#thread>` reference inside message text: Discord's channel chip, a glyph and the title. */
  threadRef: {
    display: 'inline-flex',
    gap: 2,
    alignItems: 'center',
    maxWidth: '100%',
    marginBlock: 0,
    marginInline: 0,
    paddingBlock: 0,
    paddingInline: 4,
    borderWidth: 0,
    borderRadius: 4,
    font: 'inherit',
    fontWeight: 500,
    lineHeight: 'inherit',
    color: cssVar.colorInfo,
    verticalAlign: 'bottom',
    backgroundColor: cssVar.colorInfoBg,
  },
  threadRefClickable: {
    cursor: 'pointer',
    backgroundColor: { 'default': cssVar.colorInfoBg, ':hover': cssVar.colorInfoBgHover },
    transition: 'background-color 0.15s',
  },
  /** A thread that is gone, or that this view cannot open: present, but not a link. */
  threadRefMuted: {
    color: cssVar.colorTextTertiary,
    backgroundColor: cssVar.colorFillQuaternary,
  },
  threadRefTitle: {
    overflow: 'hidden',
    minWidth: 0,
    maxWidth: 280,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  messageAvatarInline: {
    display: 'inline-flex',
  },
  /** An author avatar that opens a profile card on hover gets a soft ring. */
  messageAvatarHoverable: {
    cursor: 'pointer',
    display: 'inline-flex',
    borderRadius: '50%',
    boxShadow: { 'default': null, ':hover': `0 0 0 3px ${cssVar.colorFillSecondary}` },
    transition: 'box-shadow 0.15s',
  },
  /** A mention inside the composer: highlighted text, no tag; tinted like selected text while selected. */
  composerMention: {
    userSelect: 'none',
    fontWeight: 500,
    color: mentionTokens.color,
    // `.selected` is added by the editor's selection observer, not by React.
    borderRadius: { 'default': null, ':is(.selected)': cssVar.borderRadiusXS },
    backgroundColor: { 'default': null, ':is(.selected)': mentionTokens.bg },
  },
  composer: {
    'position': 'relative',
    'flexShrink': 0,
    'paddingBlockEnd': 12,
    // The feed fades out into the composer instead of being cut at its top edge.
    '::before': {
      pointerEvents: 'none',
      content: '""',
      position: 'absolute',
      insetBlockEnd: '100%',
      insetInline: 0,
      height: 24,
      backgroundImage: `linear-gradient(to top, ${cssVar.colorBgContainer}, transparent)`,
    },
  },
  /** Typing activity above the input; rendered only while someone is replying. */
  composerStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minWidth: 0,
    minHeight: 24,
    paddingInline: 4,
  },
  /** Attach, editor and send on one line; the editor grows and then scrolls. */
  composerRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    // 10px around the 28px buttons centers a single line in the 50px card.
    minHeight: 48,
    paddingBlock: 10,
    paddingInline: 8,
  },
  composerEditor: {
    overflowY: 'auto',
    flex: '1',
    minWidth: 0,
    maxHeight: 240,
    // Buttons sit on the last line; glyphs ride high in the line box, so drop the
    // text 1px to center it on the 28px icons beside it.
    marginBlockEnd: -1,
  },
  /** Takes the composer's place while the channel or thread is archived. */
  archivedNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBlockEnd: 12,
    paddingBlock: 8,
    paddingInline: 16,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: cssVar.colorBorderSecondary,
    borderRadius: cssVar.borderRadiusLG,
    fontSize: 13,
    color: cssVar.colorTextSecondary,
    backgroundColor: cssVar.colorFillQuaternary,
  },
  muted: {
    fontSize: 12,
    color: cssVar.colorTextSecondary,
  },
  error: {
    fontSize: 13,
    color: cssVar.colorError,
  },
});

const spin = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

export const statusStyles = stylex.create({
  receipts: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    fontSize: cssVar.fontSizeSM,
  },
  /**
   * A state sits in headers that line their parts up on text baselines. An inline flex box takes
   * its baseline from its first item; were that the glyph, which has no text, the baseline would
   * fall on the glyph's bottom edge and lift the label above the name beside it. So the box aligns
   * on baselines and the glyph alone centres itself, leaving the baseline to the label.
   */
  state: {
    display: 'inline-flex',
    gap: 4,
    alignItems: 'baseline',
    color: cssVar.colorTextSecondary,
  },
  stateShrink: {
    maxWidth: '100%',
    minWidth: 0,
  },
  stateLabelEllipsis: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  /**
   * A failed reply is something to look at, not an alarm: the glyph alone takes the warning
   * colour and the label stays quiet like every other state.
   */
  stateIconError: {
    color: cssVar.colorWarning,
  },
  stateIcon: {
    flex: 'none',
    alignSelf: 'center',
  },
  /** The glyph of a reply at work or one waiting for a person; the text stays quiet. */
  stateIconAccent: {
    color: cssVar.colorInfo,
  },
  stateIconSpin: {
    animationName: { 'default': spin, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  /**
   * A reply's open-topic and stop actions show while the pointer is on the reply or focus is in
   * it, so a list of replies at work reads as states, not as a column of stop buttons.
   */
  replyActions: {
    marginInlineStart: 'auto',
    opacity: {
      'default': 0,
      [stylex.when.ancestor(':hover')]: 1,
      [stylex.when.ancestor(':focus-within')]: 1,
      '@media (hover: none)': 1,
    },
    transition: 'opacity 0.15s',
  },
  /** Kept in view while a stop is on its way, so the spinner does not vanish with the pointer. */
  replyActionsBusy: {
    opacity: 1,
  },
  /** A line under the Agent's name (24px avatar + 8px gap): its topic, or why it failed. */
  replyIndent: {
    paddingInlineStart: 32,
  },
  /** A failure reason keeps the server's line breaks and wraps a long token. */
  replyReason: {
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
  dot: {
    flex: 'none',
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'currentcolor',
  },
  /** An asleep Agent's dot: a ring, since its first reply waits for the device to wake. */
  dotHollow: {
    backgroundColor: 'transparent',
    boxShadow: 'inset 0 0 0 1.5px currentcolor',
  },
  failureButton: {
    flex: 'none',
    gap: 4,
    height: 28,
    paddingInline: 6,
    color: cssVar.colorTextSecondary,
  },
  failureIcon: {
    color: cssVar.colorWarning,
  },
  replyList: {
    overflowY: 'auto',
    // Wide enough for avatar, name, state and the stop action on one row.
    width: 336,
    maxHeight: 'min(480px, 60vh)',
  },
  popover: {
    width: 288,
    maxWidth: 'calc(100vw - 48px)',
    fontSize: cssVar.fontSizeSM,
    color: cssVar.colorText,
    overflowWrap: 'anywhere',
  },
  memberButton: {
    flex: 'none',
    gap: 4,
    height: 28,
    paddingBlock: 4,
    paddingInline: 4,
  },
  memberStack: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  memberStackItem: {
    position: 'relative',
    display: 'inline-flex',
    flex: 'none',
    marginInlineStart: { 'default': -6, ':first-child': 0 },
    borderRadius: '50%',
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: cssVar.colorBgContainer,
    // Emoji avatars are transparent; without a fill the neighbour shows through.
    backgroundColor: cssVar.colorBgContainer,
  },
  memberWorking: {
    color: cssVar.colorTextDescription,
  },
  /** A member's status line under its name: secondary text, one line. */
  memberState: {
    overflow: 'hidden',
    fontSize: cssVar.fontSizeSM,
    lineHeight: 1.5,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  /** The same list, set into the profile card instead of a second popup. */
  workingInCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 280,
    paddingBlock: 12,
    paddingInline: 16,
    overflowY: 'auto',
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: cssVar.colorBorderSecondary,
    color: cssVar.colorText,
  },
  /** A busy member's conversations on hover, as the thread browser's cards. */
  workingPopover: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: 360,
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: 'min(420px, calc(100vh - 120px))',
    overflowY: 'auto',
    color: cssVar.colorText,
  },
  workingHeading: {
    paddingInline: 4,
    paddingBlockEnd: 2,
    fontSize: 12,
    fontWeight: 500,
    color: cssVar.colorTextSecondary,
  },
  workingMain: {
    paddingBlock: 10,
    paddingInline: 12,
    borderRadius: cssVar.borderRadiusLG,
    fontSize: 14,
    fontWeight: 500,
    color: cssVar.colorTextSecondary,
    backgroundColor: cssVar.colorFillQuaternary,
  },
  /** A muted Agent's line: a bell-off icon before why it stays quiet. */
  /** A member's name, followed by its muted mark on the same line. */
  memberNameLine: {
    display: 'flex',
    gap: 6,
    alignItems: 'baseline',
    minWidth: 0,
  },
  memberMuted: {
    flexShrink: 0,
    fontSize: cssVar.fontSizeSM,
    color: cssVar.colorTextTertiary,
    whiteSpace: 'nowrap',
  },
  memberAvatar: {
    position: 'relative',
    display: 'inline-flex',
    flex: 'none',
  },
  /** Tall enough for a typical roster without scrolling; longer lists scroll. */
  memberList: {
    overflowY: 'auto',
    maxHeight: 'min(520px, 60vh)',
  },
  memberDot: {
    position: 'absolute',
    insetBlockEnd: -1,
    insetInlineEnd: -1,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '50%',
  },
});

export const toneStyles = stylex.create({
  attention: { color: cssVar.colorWarning },
  done: { color: cssVar.colorTextSecondary },
  error: { color: cssVar.colorError },
  quiet: { color: cssVar.colorTextSecondary },
  working: { color: cssVar.colorInfo },
});

const blink = stylex.keyframes({
  '0%, 80%, 100%': { opacity: 0.25 },
  '40%': { opacity: 1 },
});

export const activityStyles = stylex.create({
  line: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    maxWidth: '100%',
    fontSize: cssVar.fontSizeSM,
  },
  button: {
    height: 24,
    paddingInline: 4,
    color: cssVar.colorTextSecondary,
  },
  avatars: {
    display: 'inline-flex',
    flex: 'none',
    gap: 2,
  },
  label: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dots: {
    display: 'inline-flex',
    flex: 'none',
    gap: 3,
    alignItems: 'center',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    backgroundColor: 'currentcolor',
    animationName: {
      'default': blink,
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
  },
  delay: (index: number) => ({ animationDelay: `${index * 160}ms` }),
});
