/**
 * @vitest-environment happy-dom
 */
import { render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SharedAgentLinkBridge from './index';

const { broadcast, navigate, openShared, takePending, toastError } = vi.hoisted(() => ({
  broadcast: { handler: undefined as undefined | (() => void) },
  navigate: vi.fn(),
  openShared: vi.fn(),
  takePending: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({ toast: { error: toastError } }));
vi.mock('@lobechat/electron-client-ipc', () => ({
  useWatchBroadcast: (_event: string, handler: () => void) => {
    broadcast.handler = handler;
  },
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/services/electron/sharedAgentLink', () => ({
  sharedAgentLinkService: { takePending },
}));
vi.mock('@/store/channel', () => ({ channelActions: { openShared } }));

describe('SharedAgentLinkBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    takePending.mockResolvedValue(null);
  });

  it('opens a link that arrived before the app was listening', async () => {
    takePending.mockResolvedValueOnce('helper').mockResolvedValue(null);
    openShared.mockResolvedValue('chn_000000000001');

    render(createElement(SharedAgentLinkBridge));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/channels/chn_000000000001'));
    expect(openShared).toHaveBeenCalledExactlyOnceWith({ shareId: 'helper' });
  });

  it('opens a link that arrives while running', async () => {
    render(createElement(SharedAgentLinkBridge));
    await waitFor(() => expect(takePending).toHaveBeenCalled());

    takePending.mockResolvedValueOnce('helper').mockResolvedValue(null);
    openShared.mockResolvedValue('chn_000000000002');
    broadcast.handler?.();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/channels/chn_000000000002'));
  });

  it('says so when the share can no longer be opened', async () => {
    takePending.mockResolvedValueOnce('paused').mockResolvedValue(null);
    openShared.mockResolvedValue(undefined);

    render(createElement(SharedAgentLinkBridge));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('contacts.agent.unavailable'));
    expect(navigate).not.toHaveBeenCalled();
  });
});
