import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLandOnCreatedAgent } from './useLandOnCreatedAgent';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  openDirect: vi.fn(),
}));

vi.mock('@/features/Workspace/stableWorkspaceAwareNavigate', () => ({
  stableWorkspaceAwareNavigate: mocks.navigate,
}));
vi.mock('@/store/channel', () => ({ channelActions: { openDirect: mocks.openDirect } }));

const land = (agentId: string) => renderHook(() => useLandOnCreatedAgent()).result.current(agentId);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.openDirect.mockResolvedValue('chn_new');
});

describe('useLandOnCreatedAgent', () => {
  it('opens the new Agent in its direct Channel', async () => {
    await land('agt_new');

    expect(mocks.openDirect).toHaveBeenCalledWith('agt_new');
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/channels/chn_new');
  });

  it('falls back to the contact card when the Channel cannot open', async () => {
    mocks.openDirect.mockResolvedValueOnce(undefined);
    await land('agt_new');
    expect(mocks.navigate).toHaveBeenLastCalledWith('/agents/agt_new');

    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    mocks.openDirect.mockRejectedValueOnce(new Error('offline'));
    await land('agt_new');
    expect(mocks.navigate).toHaveBeenLastCalledWith('/agents/agt_new');
  });
});
