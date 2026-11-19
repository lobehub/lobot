/** A laid-out box. `bottom` is the avatar's lower edge; the card only needs its top. */
interface ConnectorRect {
  bottom?: number;
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface ConnectorBox {
  height: number;
  left: number;
  top: number;
  width: number;
}

const AVATAR_SIZE = 36;
/** Shorter than this and the elbow is a speck; the caller keeps the last good line instead. */
const MIN_ARM = 8;

/**
 * The L from under the avatar to the card's vertical middle.
 * A missing or zero-size face uses the avatar's usual place (16px in, 8px down, 36px tall).
 * Returns null when the card has no size yet, or the elbow would be shorter than `MIN_ARM`.
 */
export const connectorBox = (
  row: ConnectorRect,
  card: ConnectorRect,
  avatar: ConnectorRect | null,
): ConnectorBox | null => {
  if (row.width < 1 || card.width < 1 || card.height < 1) return null;
  const laidOut = !!avatar && avatar.width >= 1 && avatar.height >= 1;
  const left = laidOut ? avatar.left + avatar.width / 2 - row.left : 16 + AVATAR_SIZE / 2;
  const top = laidOut ? (avatar.bottom ?? avatar.top + avatar.height) - row.top : 8 + AVATAR_SIZE;
  const width = card.left - row.left - left;
  const height = card.top + card.height / 2 - row.top - top;
  if (width < MIN_ARM || height < MIN_ARM) return null;
  return {
    height: Math.round(height),
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
  };
};

/** A failed read must not wipe a line that was already drawn. */
export const retainConnectorBox = (
  previous: ConnectorBox | null,
  next: ConnectorBox | null,
): ConnectorBox | null => {
  if (!next) return previous;
  if (
    previous &&
    previous.left === next.left &&
    previous.top === next.top &&
    previous.width === next.width &&
    previous.height === next.height
  ) {
    return previous;
  }
  return next;
};
