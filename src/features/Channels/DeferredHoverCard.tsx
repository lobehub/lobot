import {
  cloneElement,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  useState,
} from 'react';

type TriggerProps = {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
};

export interface DeferredCardControl {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * Mounts a profile card only once its trigger is reached. A feed shows an avatar on every
 * message, and each card brings its own popover and fetch hooks; until someone reaches for one,
 * the bare trigger is all that renders.
 *
 * Hover mounts on the first pointer or focus, and the card opens on the next move. Click mounts
 * and opens on the first click, then stays mounted so later clicks toggle it.
 */
export const DeferredHoverCard = ({
  children,
  openOn = 'hover',
  render,
}: {
  /** The trigger: a DOM element, so it can take the pointer, focus, or click handlers. */
  children: ReactElement;
  /** `click` opens the card on the first click instead of on hover. */
  openOn?: 'click' | 'hover';
  render: (trigger: ReactElement, control?: DeferredCardControl) => ReactElement;
}) => {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  if (mounted) {
    return render(children, openOn === 'click' ? { onOpenChange: setOpen, open } : undefined);
  }

  const trigger = children as ReactElement<TriggerProps>;
  const { onClick, onFocus, onPointerEnter } = trigger.props;
  if (openOn === 'click') {
    return cloneElement(trigger, {
      onClick: (event: MouseEvent<HTMLElement>) => {
        onClick?.(event);
        setMounted(true);
        setOpen(true);
      },
    });
  }
  return cloneElement(trigger, {
    onFocus: (event: FocusEvent<HTMLElement>) => {
      setMounted(true);
      onFocus?.(event);
    },
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      setMounted(true);
      onPointerEnter?.(event);
    },
  });
};
