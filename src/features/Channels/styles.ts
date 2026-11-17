import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

const HOVER = '@media (hover: hover)';

export const styles = stylex.create({
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
  threadHeader: {
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: cssVar.colorBorderSecondary,
  },
  feed: {
    overflowY: 'auto',
    flex: '1',
    minHeight: 0,
    paddingBlockStart: 8,
    paddingBlockEnd: 24,
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
  highlightedMessage: { backgroundColor: cssVar.colorInfoBg },
  /** A message still on its way shows faded instead of carrying a status line. */
  pendingMessage: { opacity: 0.6 },
  messageAvatar: {
    position: 'absolute',
    insetBlockStart: 8,
    insetInlineStart: 0,
  },
  // A continuation has no header for its toolbar; reserve room for both actions.
  continuationWithAction: {
    paddingInlineEnd: 88,
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
    insetBlockStart: 4,
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
  /**
   * A person's message: a short bubble, theirs on the left under their avatar and name,
   * your own on the right with neither, like a chat app.
   */
  bubbleRow: {
    display: 'flex',
    paddingBlock: 6,
  },
  /** A follow-up from the same person sits close under the bubble before it. */
  bubbleRowCompact: { paddingBlock: 2 },
  bubbleAvatar: {
    position: 'absolute',
    insetBlockStart: 6,
    insetInlineStart: 16,
    display: 'inline-flex',
  },
  bubbleColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
    maxWidth: '100%',
  },
  // Clear of the avatar column, so every bubble from one person lines up.
  bubbleColumnOther: { alignItems: 'flex-start', paddingInlineStart: 36 },
  // Clear of the hover toolbar on the left, and short enough to read as yours at a glance.
  bubbleColumnOwn: { alignItems: 'flex-end', marginInlineStart: 'auto', paddingInlineStart: 48 },
  bubbleColumnEditing: { flexGrow: 1 },
  bubbleAuthor: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    minWidth: 0,
    fontSize: cssVar.fontSizeSM,
    color: cssVar.colorTextSecondary,
  },
  bubbleAuthorName: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bubbleLine: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 0,
    maxWidth: 'min(100%, 640px)',
  },
  bubbleLineOwn: { flexDirection: 'row-reverse' },
  bubbleStack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    minWidth: 0,
  },
  bubbleStackOwn: { alignItems: 'flex-end' },
  bubble: {
    minWidth: 0,
    maxWidth: '100%',
    paddingBlock: 8,
    paddingInline: 12,
    borderRadius: 16,
    lineHeight: 1.55,
    overflowWrap: 'anywhere',
    backgroundColor: cssVar.colorFillTertiary,
  },
  /** Your own words, inverted: the darkest thing in the feed is what you said. */
  bubbleOwn: {
    color: cssVar.colorBgContainer,
    backgroundColor: cssVar.colorText,
  },
  /** Time (and any relay or failure mark) beside the bubble, on the side away from it. */
  bubbleSideMeta: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: 6,
    paddingBlockEnd: 2,
  },
  bubbleSideMetaHover: {
    opacity: {
      default: 1,
      [HOVER]: {
        default: 0,
        [stylex.when.ancestor(':hover')]: 1,
        [stylex.when.ancestor(':focus-within')]: 1,
      },
    },
  },
  messageEditedOwn: { alignSelf: 'flex-end' },
  /** An Agent's reply reads as a document: full width, airier lines than chat. */
  agentBody: { lineHeight: 1.7 },
  /** Says "this is an Agent" beside its name, so its long replies are never mistaken for a person's. */
  agentBadge: {
    flexShrink: 0,
    alignSelf: 'center',
    paddingInline: 5,
    borderRadius: 4,
    fontSize: 11,
    lineHeight: '16px',
    fontWeight: 500,
    color: cssVar.colorSuccess,
    backgroundColor: cssVar.colorSuccessBg,
  },
  /** A plain centered date; a rule on each side read heavier than the messages it separates. */
  dateDivider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBlock: 12,
    fontSize: cssVar.fontSizeSM,
    color: cssVar.colorTextSecondary,
  },
  /** Floats over the row's top-right corner while the row is hovered or focused. */
  /** A member row's "more" button: shown on row hover or focus where hover exists. */
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
  messageToolbar: {
    position: 'absolute',
    insetBlockStart: 6,
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
  /** Your bubble sits on the right, so its toolbar floats on the left instead. */
  messageToolbarOwn: { insetInlineEnd: 'auto', insetInlineStart: 16 },
  /** Inline system line in the timeline, such as who joined. */
  event: {
    paddingBlock: 8,
    paddingInlineStart: 48,
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
  /** A mentioned member inside message text. */
  mention: {
    paddingBlock: 1,
    paddingInline: 4,
    borderRadius: 4,
    fontWeight: 500,
    color: cssVar.colorInfo,
    backgroundColor: cssVar.colorInfoBg,
  },
  /** A mention of a known member opens their profile card on hover. */
  mentionHoverable: {
    cursor: 'pointer',
    backgroundColor: { 'default': cssVar.colorInfoBg, ':hover': cssVar.colorInfoBgHover },
    transition: 'background-color 0.15s',
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
    color: cssVar.colorInfo,
    // `.selected` is added by the editor's selection observer, not by React.
    borderRadius: { 'default': null, ':is(.selected)': cssVar.borderRadiusXS },
    backgroundColor: { 'default': null, ':is(.selected)': cssVar.colorInfoBgHover },
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

export const statusStyles = stylex.create({
  receipts: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    fontSize: cssVar.fontSizeSM,
  },
  state: {
    display: 'inline-flex',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    flex: 'none',
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'currentcolor',
  },
  /** A bare red dot beside a message whose reply failed. */
  failureMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    padding: 0,
    borderWidth: 0,
    borderRadius: '50%',
    color: cssVar.colorError,
    cursor: 'pointer',
    backgroundColor: { 'default': 'transparent', ':hover': cssVar.colorErrorBg },
  },
  failureButton: {
    flex: 'none',
    gap: 4,
    height: 28,
    paddingInline: 6,
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
    color: cssVar.colorWarning,
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
