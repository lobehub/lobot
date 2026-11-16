/**
 * @vitest-environment happy-dom
 */
import { render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SharedAgentLinkBridge from './index';

const { broadcast, navigate, takePending } = vi.hoisted(() => ({
  broadcast: { handler: undefined as undefined | (() => void) },
  navigate: vi.fn(),
  takePending: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({ toast: { error: vi.fn() } }));
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

describe('SharedAgentLinkBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    takePending.mockResolvedValue(null);
  });

  it('opens the shared Agent’s profile for a link that arrived before the app listened', async () => {
    takePending.mockResolvedValueOnce('my helper').mockResolvedValue(null);

    render(createElement(SharedAgentLinkBridge));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/agents/shared/my%20helper'));
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('opens the profile for a link that arrives while running', async () => {
    render(createElement(SharedAgentLinkBridge));
    await waitFor(() => expect(takePending).toHaveBeenCalled());

    takePending.mockResolvedValueOnce('helper').mockResolvedValue(null);
    broadcast.handler?.();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/agents/shared/helper'));
  });
});
