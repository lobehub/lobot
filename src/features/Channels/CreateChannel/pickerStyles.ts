import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

export const pickerStyles = stylex.create({
  /** Candidates sit on a tinted pane so the chosen side reads as the result, like WeChat. */
  candidates: {
    padding: 12,
    backgroundColor: cssVar.colorFillQuaternary,
  },
  picker: {
    overflow: 'hidden',
    display: 'flex',
    height: 500,
    maxHeight: '55vh',
    minHeight: 240,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: cssVar.colorBorderSecondary,
    borderRadius: cssVar.borderRadiusLG,
  },
  pane: { flex: '1', minWidth: 0, minHeight: 0, overflowY: 'auto' },
  selected: { padding: 12 },
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
