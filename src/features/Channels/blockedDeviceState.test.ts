import type { DeviceListItem } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import { blockedDeviceState } from './blockedDeviceState';

const device = (patch: Partial<DeviceListItem> = {}) =>
  ({ deviceId: 'dev-1', online: false, ...patch }) as DeviceListItem;

describe('blockedDeviceState', () => {
  it('reports the configured device offline when the gateway does not see it', () => {
    const offline = device();
    expect(blockedDeviceState('dev-1', [offline], true)).toEqual({
      device: offline,
      kind: 'offline',
    });
  });

  it('reports the device online once it reconnects', () => {
    const online = device({ online: true });
    expect(blockedDeviceState('dev-1', [online], true)).toEqual({ device: online, kind: 'online' });
  });

  it('keeps presence unknown until the server confirms the list', () => {
    expect(blockedDeviceState('dev-1', [device()], false)).toEqual({ kind: 'checking' });
    expect(blockedDeviceState('dev-1', [device({ onlineUnknown: true })], true)).toEqual({
      kind: 'checking',
    });
    expect(blockedDeviceState('dev-1', undefined, false)).toEqual({ kind: 'checking' });
  });

  it('reports a device missing from the confirmed list', () => {
    expect(blockedDeviceState('dev-1', [device({ deviceId: 'dev-2' })], true)).toEqual({
      kind: 'missing',
    });
  });
});
