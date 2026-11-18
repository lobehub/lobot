import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useElectronStore } from '@/store/electron';

const service = vi.hoisted(() => ({ getRemoteServerConfig: vi.fn() }));

vi.mock('@lobechat/const', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  isDesktop: true,
}));

vi.mock('@/services/electron/remoteServer', () => ({ remoteServerService: service }));

describe('useDataSyncConfig', () => {
  beforeEach(() => {
    service.getRemoteServerConfig.mockReset();
  });

  it('refreshes user data only when the config changes after the first answer', async () => {
    const refreshUserData = vi.fn().mockResolvedValue(undefined);
    useElectronStore.setState({ refreshUserData });
    service.getRemoteServerConfig.mockResolvedValue({ active: true, storageMode: 'cloud' });

    const { result } = renderHook(() => useElectronStore.getState().useDataSyncConfig());

    await waitFor(() => expect(useElectronStore.getState().isInitRemoteServerConfig).toBe(true));
    expect(useElectronStore.getState().dataSyncConfig).toEqual({
      active: true,
      storageMode: 'cloud',
    });
    expect(refreshUserData).not.toHaveBeenCalled();

    // Same answer again: no reset of the user stores.
    await act(() => result.current.revalidate());
    expect(refreshUserData).not.toHaveBeenCalled();

    service.getRemoteServerConfig.mockResolvedValue({ active: false, storageMode: 'cloud' });
    await act(() => result.current.revalidate());

    await waitFor(() => expect(useElectronStore.getState().dataSyncConfig.active).toBe(false));
    expect(refreshUserData).toHaveBeenCalledOnce();
  });
});
