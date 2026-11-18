import { describe, expect, it } from 'vitest';

import { profileEnvironment } from './profileEnvironment';

const devices = [
  { defaultCwd: '/home/me', deviceId: 'mac' },
  { defaultCwd: '/root', deviceId: 'box' },
];

describe('profileEnvironment', () => {
  it('shows the device picked in the Channel ahead of the Agent’s own', () => {
    expect(
      profileEnvironment({
        bindingDeviceId: 'box',
        channel: { deviceId: 'mac', workingDirectory: '/repo/lobot' },
        devices,
      }),
    ).toEqual({ deviceId: 'mac', directory: '/repo/lobot', source: 'channel' });
  });

  it('falls back to the device’s default folder when the Channel picked no directory', () => {
    expect(profileEnvironment({ channel: { deviceId: 'mac' }, devices })).toEqual({
      deviceId: 'mac',
      directory: '/home/me',
      source: 'channel',
    });
  });

  it('follows the Agent’s bound device and its per-device directory', () => {
    expect(
      profileEnvironment({
        agencyConfig: { workingDirByDevice: { box: '/srv/app' } },
        bindingDeviceId: 'box',
        channel: {},
        devices,
      }),
    ).toEqual({ deviceId: 'box', directory: '/srv/app', source: 'agent' });
  });

  it('uses the device default when the Agent chose no directory there', () => {
    expect(profileEnvironment({ bindingDeviceId: 'box', devices })).toEqual({
      deviceId: 'box',
      directory: '/root',
      source: 'agent',
    });
  });

  it('names no device for an Agent that runs without one', () => {
    expect(profileEnvironment({ bindingDeviceId: null, devices })).toEqual({ source: 'agent' });
  });
});
