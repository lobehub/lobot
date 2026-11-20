import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const notification = vi.hoisted(() => ({ on: vi.fn(), show: vi.fn() }));
const image = vi.hoisted(() => ({
  isEmpty: vi.fn(() => false),
  toPNG: vi.fn(() => Buffer.from('png')),
}));

vi.mock('electron', () => {
  const MockNotification = vi.fn(function () {
    return notification;
  });
  return {
    Notification: MockNotification,
    nativeImage: { createFromDataURL: vi.fn(() => image) },
  };
});

const { showElectronNotification } = await import('../notificationShared');
const { Notification } = await import('electron');

describe('showElectronNotification avatar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    image.isEmpty.mockReturnValue(false);
    notification.on.mockClear();
    vi.mocked(Notification).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const params = {
    body: 'ship it',
    sender: {
      avatarDataUrl: 'data:image/png;base64,aaaa',
      conversationId: 'chn_1',
      name: 'Ann',
    },
    title: 'Ann',
  };

  it('shows the sender portrait in the small logo slot and still delivers the click', async () => {
    const onClick = vi.fn();
    const promise = showElectronNotification({ onClick, params, urgency: 'normal' });
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(Notification).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'ship it', icon: image, title: 'Ann' }),
    );
    expect(vi.mocked(Notification).mock.calls[0]?.[0]).not.toHaveProperty('toastXml');

    const click = notification.on.mock.calls.find((call) => call[0] === 'click')?.[1];
    click?.();
    expect(onClick).toHaveBeenCalled();
  });
});
