import { describe, expect, it } from 'vitest';

import { channelSidePanelSize, MEMBER_PANEL_WIDTH } from './MemberPanel';

describe('channelSidePanelSize', () => {
  it('leaves room to drag the panel wider beside a wide conversation', () => {
    const size = channelSidePanelSize(1200, MEMBER_PANEL_WIDTH);

    expect(size.mode).toBe('fixed');
    expect(size.minWidth).toBe(MEMBER_PANEL_WIDTH);
    expect(size.maxWidth).toBeGreaterThan(size.minWidth);
    expect(size.width).toBe(MEMBER_PANEL_WIDTH);
  });

  it('keeps a remembered width within the room the conversation leaves', () => {
    expect(channelSidePanelSize(1200, 400).width).toBe(400);
    expect(channelSidePanelSize(1200, 900).width).toBe(480);
    expect(channelSidePanelSize(700, 400).width).toBe(340);
    expect(channelSidePanelSize(1200, 100).width).toBe(MEMBER_PANEL_WIDTH);
  });

  it('floats full-width over a narrow conversation', () => {
    expect(channelSidePanelSize(500, 400)).toEqual({
      maxWidth: 500,
      minWidth: 500,
      mode: 'float',
      width: 500,
    });
  });

  it('applies a settings-only minimum to an older remembered width', () => {
    expect(channelSidePanelSize(1200, 256, 320)).toMatchObject({ minWidth: 320, width: 320 });
    expect(channelSidePanelSize(640, 256, 320)).toMatchObject({
      minWidth: 320,
      maxWidth: 320,
      width: 320,
    });
    // A panel that does not opt in retains the original minimum.
    expect(channelSidePanelSize(1200, 256).width).toBe(256);
  });

  it('keeps settings inside a narrow viewport instead of enforcing the fixed minimum', () => {
    expect(channelSidePanelSize(280, 256, 320)).toEqual({
      maxWidth: 280,
      minWidth: 280,
      mode: 'float',
      width: 280,
    });
  });
});
