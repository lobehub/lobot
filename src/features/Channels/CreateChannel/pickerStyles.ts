import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

export const pickerStyles = stylex.create({
  /** The dialog is the two panes. A line splits them; neither pane is another card. */
  candidates: {
    flex: '1',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    borderInlineEndWidth: 1,
    borderInlineEndStyle: 'solid',
    borderInlineEndColor: cssVar.colorBorderSecondary,
  },
  picker: {
    overflow: 'hidden',
    display: 'flex',
    height: 520,
    maxHeight: '68vh',
    minHeight: 360,
  },
  search: {
    flex: 'none',
    // The modal title bar already pads its bottom edge, so the body starts flush.
    paddingBlockEnd: 8,
    paddingInline: 16,
  },
  list: {
    flex: '1',
    minWidth: 0,
    minHeight: 0,
  },
  listContent: {
    paddingInline: 8,
    paddingBlockEnd: 8,
  },
  /** Chosen members scroll between the name and the actions. */
  aside: {
    flex: '1',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
  },
  selected: {
    flex: '1',
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    paddingBlock: 8,
    paddingInline: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    cursor: 'pointer',
    borderRadius: cssVar.borderRadius,
    backgroundColor: { 'default': 'transparent', ':hover': cssVar.colorFillTertiary },
  },
  /** Group heading or note inside a pane, aligned with the row content. */
  section: {
    paddingBlock: 4,
    paddingInline: 8,
  },
  sectionToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    margin: 0,
    borderWidth: 0,
    borderRadius: cssVar.borderRadius,
    font: 'inherit',
    textAlign: 'start',
    cursor: 'pointer',
    color: cssVar.colorTextSecondary,
    backgroundColor: { 'default': 'transparent', ':hover': cssVar.colorFillTertiary },
  },
  chevron: { flex: 'none', transition: 'transform 0.2s ease' },
  open: { transform: 'rotate(90deg)' },
});
