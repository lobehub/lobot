import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

// Compact footer: avatar + name on the left, contacts ActionIcon on the right.
export const TAB_ICON_SIZE = 24;

export const styles = stylex.create({
  badge: {
    pointerEvents: 'none',
    position: 'absolute',
    insetBlockStart: '0',
    insetInlineEnd: '-2px',
    minWidth: '16px',
    height: '16px',
    paddingInline: '4px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '999px',
    fontSize: '9px',
    fontWeight: 600,
    lineHeight: '13px',
    color: '#fff',
    textAlign: 'center',
    // Red like the conversation rows' unread badge, so the count reads as unread, not as a label.
    backgroundColor: cssVar.colorError,
  },
  bar: {
    userSelect: 'none',
    overflow: 'visible',
    flex: 'none',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    minHeight: '52px',
    paddingBlockStart: 0,
    paddingBlockEnd: '8px',
    paddingInline: '12px',
  },
  user: {
    cursor: 'pointer',
    appearance: 'none',
    overflow: 'visible',
    display: 'flex',
    flex: '1',
    alignItems: 'center',
    minWidth: '0',
    gap: '8px',
    margin: '0',
    padding: '0',
    borderWidth: '0',
    borderStyle: 'none',
    backgroundColor: 'transparent',
    color: cssVar.colorText,
    textAlign: 'start',
  },
  contacts: {
    position: 'relative',
    flex: 'none',
  },
  contactsIcon: {
    backgroundColor: `color-mix(in srgb, ${cssVar.colorFillQuaternary} 50%, ${cssVar.colorFillTertiary})`,
  },
  item: {
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flex: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: cssVar.borderRadius,
    color: { 'default': cssVar.colorTextTertiary, ':hover': cssVar.colorText },
    backgroundColor: { 'default': null, ':hover': cssVar.colorFillTertiary },
    transition: 'color 0.15s, background-color 0.15s',
  },
  avatar: {
    display: 'flex',
    flex: 'none',
    borderRadius: '50%',
  },
  // Like Telegram, the active tab is told apart by the primary color, not a filled chip.
  itemActive: {
    color: { 'default': cssVar.colorPrimary, ':hover': cssVar.colorPrimary },
  },
});
