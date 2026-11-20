import * as stylex from '@stylexjs/stylex';
import type { LucideIcon } from 'lucide-react';
import { Check, CircleAlert, Clock, Hand, LoaderCircle } from 'lucide-react';

import type { ChannelStatusTone } from './jobStatus';
import { statusStyles } from './styles';

/**
 * Each state has its own glyph, so states tell apart by shape, not by a row of coloured dots; a
 * reply that waits for someone to step in raises a hand. The text stays one quiet colour; only the
 * glyph takes a colour: amber for a failure, blue for the working spinner and the hand.
 */
const TONE_ICONS: Record<ChannelStatusTone, LucideIcon> = {
  attention: Hand,
  done: Check,
  error: CircleAlert,
  quiet: Clock,
  working: LoaderCircle,
};

/**
 * A status line led by its state's glyph. `hideIcon` is for a line beside an avatar that already
 * wears the state as a dot. `ellipsis` lets a long label (a topic's name) shrink to one line.
 */
export function ChannelStatus({
  ellipsis,
  hideIcon,
  label,
  tone,
}: {
  ellipsis?: boolean;
  hideIcon?: boolean;
  label: string;
  tone: ChannelStatusTone;
}) {
  const Icon = TONE_ICONS[tone];
  return (
    <span
      data-tone={tone}
      title={ellipsis ? label : undefined}
      {...stylex.props(statusStyles.state, ellipsis && statusStyles.stateShrink)}
    >
      {!hideIcon && (
        <Icon
          aria-hidden
          size={12}
          {...stylex.props(
            statusStyles.stateIcon,
            tone === 'working' && statusStyles.stateIconSpin,
            (tone === 'working' || tone === 'attention') && statusStyles.stateIconAccent,
            tone === 'error' && statusStyles.stateIconError,
          )}
        />
      )}
      {ellipsis ? <span {...stylex.props(statusStyles.stateLabelEllipsis)}>{label}</span> : label}
    </span>
  );
}
