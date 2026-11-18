import { afterEach, describe, expect, it, vi } from 'vitest';

import { cacheScope, replicaSWRDriver } from '@/libs/replica';

import { refreshAgentDeviceBindings } from './agentDeviceBinding';
import { agentDeviceBindingResource } from './projection';

const syncKey = (name: string, scope: string, agentId: string) => [
  'replica:sync',
  name,
  1,
  scope,
  agentId,
  { agentId },
];

describe('refreshAgentDeviceBindings', () => {
  afterEach(() => vi.restoreAllMocks());

  it('revalidates every mounted agent device binding of the active scope, and nothing else', () => {
    vi.spyOn(cacheScope, 'get').mockReturnValue('user-1:ws-1');
    const revalidate = vi.spyOn(replicaSWRDriver, 'revalidate').mockResolvedValue(undefined);

    void refreshAgentDeviceBindings();

    const matcher = revalidate.mock.calls[0][0];
    const name = agentDeviceBindingResource.name;
    expect(matcher(syncKey(name, 'user-1:ws-1', 'agt_1'))).toBe(true);
    expect(matcher(syncKey(name, 'user-1:ws-1', 'agt_2'))).toBe(true);
    expect(matcher(syncKey(name, 'user-1:ws-2', 'agt_1'))).toBe(false);
    expect(matcher(syncKey('deviceList', 'user-1:ws-1', 'all'))).toBe(false);
    expect(matcher(['device/listDevices'])).toBe(false);
  });
});
