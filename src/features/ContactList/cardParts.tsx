'use client';

import { cx, Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontalIcon } from 'lucide-react';
import type { Ref } from 'react';

/** Layout pieces shared by the contact cards: an Agent's, a shared Agent's and a person's. */
export const AVATAR_SIZE = 88;
export const COVER_HEIGHT = 144;

export const styles = stylex.create({
  body: {
    paddingBlockEnd: '48px',
    paddingInline: '24px',
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center',
  },
  // A card without a cover starts lower, where the cover would have ended.
  coverless: {
    paddingBlockStart: '32px',
  },
  // The badge cover from the agents wall, widened into a profile header.
  cover: {
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    borderRadius: '12px',
    height: `${COVER_HEIGHT}px`,
    width: '100%',
  },
  // The avatar straddles the cover's bottom edge, as on the badge.
  avatar: {
    marginBlockStart: `-${AVATAR_SIZE / 2}px`,
  },
  actions: {
    display: 'grid',
    gridAutoColumns: 'minmax(0, 1fr)',
    gridAutoFlow: 'column',
    gap: '8px',
    width: '100%',
    marginBlockStart: '16px',
  },
  // An IM-profile action: icon over label, the whole tile clickable.
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    paddingBlock: '12px',
    paddingInline: '8px',
    borderWidth: 0,
    borderRadius: '12px',
    fontFamily: 'inherit',
    fontSize: '12px',
    lineHeight: '18px',
    color: cssVar.colorText,
    textDecoration: 'none',
    cursor: 'pointer',
    backgroundColor: {
      'default': cssVar.colorFillTertiary,
      ':hover': cssVar.colorFillSecondary,
    },
    transitionProperty: 'background-color',
    transitionDuration: '0.15s',
  },
  state: {
    paddingBlock: '48px',
    paddingInline: '24px',
    maxWidth: '520px',
    width: '100%',
  },
});

export const TileContent = ({ icon, label }: { icon: LucideIcon; label: string }) => (
  <>
    <Icon icon={icon} size={20} />
    <span>{label}</span>
  </>
);

// Takes the ref and props a DropdownMenu trigger hands its child.
export const MenuTile = ({
  className,
  label,
  ref,
  ...rest
}: {
  className?: string;
  label: string;
  ref?: Ref<HTMLButtonElement>;
}) => (
  <button
    ref={ref}
    type="button"
    {...rest}
    className={cx(stylex.props(styles.tile).className, className)}
  >
    <TileContent icon={MoreHorizontalIcon} label={label} />
  </button>
);
