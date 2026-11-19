import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

/** Consumer-profile groups; deliberately separate from the flat Channel settings form. */
export const agentProfileStyles = stylex.create({
  card: {
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: cssVar.colorFillQuaternary,
  },
  environment: {
    padding: 12,
  },
});
