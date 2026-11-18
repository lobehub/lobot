import {
  cloneElement,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  useState,
} from 'react';

type TriggerProps = {
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
};

/**
 * Mounts a hover card only once its trigger is first pointed at or focused. A feed shows an avatar
 * and mention chips on every message, and each profile card brings its own popover, permission
 * checks and fetch hooks; until someone reaches for one, the bare trigger is all that renders.
 *
 * One-way: once mounted the card stays, so it opens on the next pointer move and later hovers
 * cost nothing extra.
 */
export const DeferredHoverCard = ({
  children,
  render,
}: {
  /** The trigger: a DOM element, so it can take the pointer and focus handlers. */
  children: ReactElement;
  render: (trigger: ReactElement) => ReactElement;
}) => {
  const [mounted, setMounted] = useState(false);
  if (mounted) return render(children);

  const trigger = children as ReactElement<TriggerProps>;
  const { onFocus, onPointerEnter } = trigger.props;
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
