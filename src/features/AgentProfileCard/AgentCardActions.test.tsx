/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentCardActions } from './AgentCardActions';

const { navigate, openContactsFromUrl, openDirect, params, state } = vi.hoisted(() => ({
  navigate: vi.fn(),
  openContactsFromUrl: vi.fn(),
  openDirect: vi.fn(),
  params: { channelId: undefined as string | undefined },
  state: { directId: undefined as string | undefined },
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useParams: () => params }));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/features/NavRail/contactsPopupStore', () => ({ openContactsFromUrl }));
vi.mock('@/store/channel', () => ({
  channelActions: { openDirect },
  channelSelectors: {
    directByAgent: () => () => (state.directId ? { id: state.directId } : undefined),
  },
  useChannelStore: (selector: (s: unknown) => unknown) => selector({}),
}));

const onDone = vi.fn();
const renderActions = () =>
  render(
    <AgentCardActions agentId={'agt_justin'} profileUrl={'/agents/agt_justin'} onDone={onDone} />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  params.channelId = 'chn_project';
  state.directId = undefined;
});

describe('AgentCardActions', () => {
  it('opens the direct conversation with the Agent from "Send message"', async () => {
    openDirect.mockResolvedValue('chn_direct');
    renderActions();

    fireEvent.click(screen.getByText('contacts.sendMessage'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/channels/chn_direct'));
    expect(openDirect).toHaveBeenCalledWith('agt_justin');
    expect(onDone).toHaveBeenCalled();
  });

  it('opens the Agent profile from "View profile" with the contact list folded', () => {
    openContactsFromUrl.mockReturnValue(true);
    renderActions();

    fireEvent.click(screen.getByText('contacts.viewProfile'));

    expect(openContactsFromUrl).toHaveBeenCalledWith('/agents/agt_justin', {
      listCollapsed: true,
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('navigates to the profile when it is not a contacts page', () => {
    openContactsFromUrl.mockReturnValue(false);
    renderActions();

    fireEvent.click(screen.getByText('contacts.viewProfile'));

    expect(navigate).toHaveBeenCalledWith('/agents/agt_justin');
  });

  it('leaves out "Send message" inside the conversation with that Agent', () => {
    state.directId = 'chn_direct';
    params.channelId = 'chn_direct';
    renderActions();

    expect(screen.queryByText('contacts.sendMessage')).toBeNull();
    expect(screen.getByText('contacts.viewProfile')).toBeTruthy();
  });
});
