import { describe, expect, it } from 'vitest';

import { resetSettingsPopupViewport } from './settingsPopupScroll';

describe('resetSettingsPopupViewport', () => {
  const viewport = () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollTop', { configurable: true, value: 80, writable: true });
    return el;
  };

  it('resets the viewport when the popup is open and there is no hash', () => {
    const el = viewport();
    resetSettingsPopupViewport(el, { hash: null, open: true });
    expect(el.scrollTop).toBe(0);
  });

  it('does not reset when closed, when a hash is present, or when the node is missing', () => {
    const closed = viewport();
    resetSettingsPopupViewport(closed, { hash: null, open: false });
    expect(closed.scrollTop).toBe(80);

    const hashed = viewport();
    resetSettingsPopupViewport(hashed, { hash: 'appearance-font-size', open: true });
    expect(hashed.scrollTop).toBe(80);

    expect(() => resetSettingsPopupViewport(null, { hash: null, open: true })).not.toThrow();
  });
});
