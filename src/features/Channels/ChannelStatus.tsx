import * as stylex from '@stylexjs/stylex';
import type { LucideIcon } from 'lucide-react';
import { Check, CircleX, Clock, Hand, LoaderCircle } from 'lucide-react';

import type { ChannelStatusTone } from './jobStatus';
import { statusStyles } from './styles';

/**
 * Each state has its own glyph, so states tell apart by shape, not by a row of coloured dots; a
 * reply that waits for someone to step in raises a hand. The text stays one quiet colour. Only an
 * error is red, and only the hand is blue.
 */
const TONE_ICONS: Record<ChannelStatusTone, LucideIcon> = {
  attention: Hand,
  done: Check,
  error: CircleX,
  quiet: Clock,
  working: LoaderCircle,
};

/**
 * A status line led by its state's glyph. `hideIcon` is for a line beside an avatar that already
 * wears the state as a dot.
 */
export function ChannelStatus({
  hideIcon,
  label,
  tone,
}: {
  hideIcon?: boolean;
  label: string;
  tone: ChannelStatusTone;
}) {
  const Icon = TONE_ICONS[tone];
  return (
    <span
      data-tone={tone}
      {...stylex.props(statusStyles.state, tone === 'error' ? statusStyles.stateError : null)}
    >
      {!hideIcon && (
        <Icon
          aria-hidden
          size={12}
          {...stylex.props(
            statusStyles.stateIcon,
            tone === 'working' && statusStyles.stateIconSpin,
            tone === 'attention' && statusStyles.stateIconAttention,
          )}
        />
      )}
      {label}
    </span>
  );
}
