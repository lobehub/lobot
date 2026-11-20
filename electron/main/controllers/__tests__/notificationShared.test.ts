import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const windows = vi.hoisted(() => vi.fn(() => true));
const notification = vi.hoisted(() => ({ on: vi.fn(), show: vi.fn() }));
const image = vi.hoisted(() => ({
  isEmpty: vi.fn(() => false),
  toPNG: vi.fn(() => Buffer.from('png')),
}));

vi.mock('@/utils/platform', () => ({ windows }));
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined),
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

const { showElectronNotification, windowsAvatarToastXml } = await import('../notificationShared');
const { Notification } = await import('electron');
const { writeFile } = await import('node:fs/promises');

describe('windowsAvatarToastXml', () => {
  it('puts the sender image in the app-icon slot, cropped to a circle, and escapes the text', () => {
    expect(
      windowsAvatarToastXml({
        body: 'Tom & Jerry',
        silent: true,
        src: 'file:///C:/avatars/a.png',
        title: 'Ann <Marketing>',
      }),
    ).toBe(
      '<toast><visual><binding template="ToastGeneric">' +
        '<text>Ann &lt;Marketing&gt;</text>' +
        '<text>Tom &amp; Jerry</text>' +
        '<image placement="appLogoOverride" hint-crop="circle" src="file:///C:/avatars/a.png"/>' +
        '</binding></visual><audio silent="true"/></toast>',
    );
  });
});

describe('showElectronNotification avatar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    windows.mockReturnValue(true);
    image.isEmpty.mockReturnValue(false);
    notification.on.mockClear();
    vi.mocked(Notification).mockClear();
    vi.mocked(writeFile).mockClear();
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

  it('shows a Windows toast whose image is the sender avatar', async () => {
    const onClick = vi.fn();
    const promise = showElectronNotification({ onClick, params, urgency: 'normal' });
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    const options = vi.mocked(Notification).mock.calls[0]?.[0];
    expect(options?.toastXml).toContain('hint-crop="circle"');
    expect(options?.toastXml).toContain('placement="appLogoOverride"');
    expect(options?.toastXml).toContain('file:');
    expect(writeFile).toHaveBeenCalled();

    const click = notification.on.mock.calls.find((call) => call[0] === 'click')?.[1];
    click?.();
    expect(onClick).toHaveBeenCalled();
  });

  it('keeps a plain banner with the avatar as its icon on other platforms', async () => {
    windows.mockReturnValue(false);

    const promise = showElectronNotification({ onClick: vi.fn(), params, urgency: 'normal' });
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(Notification).toHaveBeenCalledWith(
      expect.objectContaining({ icon: image, title: 'Ann' }),
    );
    expect(writeFile).not.toHaveBeenCalled();
  });
});
