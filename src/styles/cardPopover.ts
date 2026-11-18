import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  // The popover frame draws the background and ring; round it like the card inside, or its
  // default 8px corner shows as a light notch around the card's 12px corner.
  popup: {
    overflow: 'hidden',
    borderRadius: 12,
  },
});

/** Popover props for a profile or preview card that fills the popover edge to edge. */
export const cardPopoverProps = {
  className: stylex.props(styles.popup).className,
  styles: { content: { borderRadius: 12, overflow: 'hidden', padding: 0 } },
} as const;
