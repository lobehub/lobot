/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BlockedDevice } from './BlockedDevice';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  Button: ({ children, href }: { children?: unknown; href?: string }) =>
    href
      ? createElement('a', { href }, children as never)
      : createElement('button', {}, children as never),
  Flexbox: ({ children, style }: { children?: unknown; style?: object }) =>
    createElement('div', { style }, children as never),
  Text: ({ children }: { children?: unknown }) => createElement('span', {}, children as never),
  usePopoverContext: () => ({ close: () => {} }),
}));
vi.mock('@/features/DeviceManager/getDeviceIcon', () => ({ getDeviceIcon: () => null }));
vi.mock('@/store/channel', () => ({ channelActions: {} }));
vi.mock('./AgentEnvironment', () => ({ openChannelAgentEnvironment: () => {} }));
vi.mock('./CreateChannel/EnvironmentFields', () => ({
  deviceLabel: (device: { hostname: string }) => device.hostname,
}));
vi.mock('@/features/Electron/navigation/webApp', () => ({
  webAppUrl: (path: string) => `https://app.lobehub.com/acme${path}`,
}));
vi.mock('@/store/device/useDeviceList', () => ({
  useDeviceList: () => ({
    data: [
      { deviceId: 'dev_1', hostname: 'lobehub M4 Pro', online: true },
      {
        deviceId: 'dev_private',
        hostname: 'Private Mac',
        online: true,
        scope: 'workspace',
        visibility: 'private',
      },
    ],
    isConfirmed: true,
  }),
}));

const rowIndent = () =>
  Number.parseFloat(
    (screen.getByText('lobehub M4 Pro').closest('[style*="padding-inline-start"]') as HTMLElement)
      .style.paddingInlineStart,
  );

describe('BlockedDevice', () => {
  it('starts a failed reply’s device at the edge, like the failure reason above it', () => {
    render(createElement(BlockedDevice, { channelId: 'chn_1', deviceId: 'dev_1' }));
    expect(rowIndent()).toBe(0);
  });

  it('lines a waiting reply’s device up under the reply name', () => {
    render(createElement(BlockedDevice, { channelId: 'chn_1', deviceId: 'dev_1', waiting: true }));
    expect(rowIndent()).toBe(32);
  });

  it('does not promise a failed reply will start once its device is online', () => {
    render(createElement(BlockedDevice, { channelId: 'chn_1', deviceId: 'dev_1' }));
    expect(screen.getByText('blockedDevice.connected')).toBeTruthy();
    expect(screen.queryByText('blockedDevice.online')).toBeNull();
  });

  it('tells a waiting reply it starts once its device is online', () => {
    render(createElement(BlockedDevice, { channelId: 'chn_1', deviceId: 'dev_1', waiting: true }));
    expect(screen.getByText('blockedDevice.online')).toBeTruthy();
  });

  it('puts a failed reply’s retry beside its device', () => {
    render(
      createElement(BlockedDevice, {
        channelId: 'chn_1',
        deviceId: 'dev_1',
        retry: createElement('button', {}, 'retry'),
      }),
    );
    expect(
      screen.getByText('retry').parentElement?.contains(screen.getByText('lobehub M4 Pro')),
    ).toBe(true);
  });

  // The owner sees their private device online while another member's reply on it never starts.
  it('does not promise a reply on the viewer’s private device will start, and says why', () => {
    render(
      createElement(BlockedDevice, { channelId: 'chn_1', deviceId: 'dev_private', waiting: true }),
    );
    expect(screen.queryByText('blockedDevice.online')).toBeNull();
    expect(screen.getByText('blockedDevice.private')).toBeTruthy();
  });

  it('links a private device to its own LobeHub settings page', () => {
    render(createElement(BlockedDevice, { channelId: 'chn_1', deviceId: 'dev_private' }));
    expect(
      screen.getByText('visibility.private.openSettings').closest('a')?.getAttribute('href'),
    ).toBe('https://app.lobehub.com/acme/settings/devices/dev_private?visibility=private');
  });

  it('tells a viewer a device they cannot see is not shared with them', () => {
    render(
      createElement(BlockedDevice, { channelId: 'chn_1', deviceId: 'dev_other', waiting: true }),
    );
    expect(screen.getByText('blockedDevice.notShared')).toBeTruthy();
    expect(screen.queryByText('visibility.private.openSettings')).toBeNull();
  });

  it('names the device under an unavailable reply only when the device is the cause', () => {
    const { container } = render(
      createElement(BlockedDevice, {
        channelId: 'chn_1',
        deviceId: 'dev_1',
        restrictedOnly: true,
        waiting: true,
      }),
    );
    expect(container.textContent).toBe('');

    render(
      createElement(BlockedDevice, {
        channelId: 'chn_1',
        deviceId: 'dev_private',
        restrictedOnly: true,
        waiting: true,
      }),
    );
    expect(screen.getByText('blockedDevice.private')).toBeTruthy();
    expect(screen.getByText('blockedDevice.connected')).toBeTruthy();
  });

  it('does not tell an unavailable reply without a device that it starts on its own', () => {
    const { container } = render(
      createElement(BlockedDevice, { channelId: 'chn_1', restrictedOnly: true, waiting: true }),
    );
    expect(container.textContent).toBe('');
  });

  it('still offers retry when no device can be shown', () => {
    render(
      createElement(BlockedDevice, {
        channelId: 'chn_1',
        retry: createElement('button', {}, 'retry'),
      }),
    );
    expect(screen.getByText('retry')).toBeTruthy();
  });
});
