import { describe, expect, it } from 'vitest';

import { connectorBox, retainConnectorBox } from './threadConnector';

const rect = (left: number, top: number, width: number, height: number) => ({
  height,
  left,
  top,
  width,
});

describe('connectorBox', () => {
  it('draws from the avatar bottom to the middle of the card', () => {
    const box = connectorBox(rect(100, 200, 400, 120), rect(164, 250, 200, 60), {
      ...rect(116, 208, 36, 36),
      bottom: 244,
    });

    expect(box).toEqual({ height: 36, left: 34, top: 44, width: 30 });
  });

  it('uses the usual avatar place when the face has not been laid out', () => {
    const box = connectorBox(rect(100, 200, 400, 120), rect(164, 280, 200, 60), rect(0, 0, 0, 0));

    // Fallback top is 8 + 36. Card center is 280 + 30 - 200 = 110. Height is 110 - 44.
    expect(box).toEqual({ height: 66, left: 34, top: 44, width: 30 });
  });

  it('returns null while the card has no size, so the caller can keep the last line', () => {
    expect(connectorBox(rect(100, 200, 400, 120), rect(164, 250, 0, 0), null)).toBeNull();
  });
});

describe('retainConnectorBox', () => {
  const drawn = { height: 36, left: 34, top: 44, width: 30 };

  it('keeps the drawn line when a later read fails', () => {
    expect(retainConnectorBox(drawn, null)).toBe(drawn);
  });

  it('keeps the same object when the geometry has not moved', () => {
    expect(retainConnectorBox(drawn, { ...drawn })).toBe(drawn);
  });
});
