import * as stylex from '@stylexjs/stylex';

export const settingsStyles = stylex.create({
  scroll: {
    overflowY: 'auto',
    flex: '1',
    minHeight: 0,
  },
  content: {
    width: '100%',
    paddingBlock: 16,
    paddingInline: 16,
  },
});
