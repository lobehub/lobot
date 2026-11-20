/**
 * @vitest-environment happy-dom
 */
import type * as LobeUI from '@lobehub/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentProfilePopup from './AgentProfilePopup';

const { detail, navigate, useFetchList } = vi.hoisted(() => ({
  detail: {
    current: undefined as
      { agencyConfig?: { heterogeneousProvider?: { type?: string } } } | undefined,
  },
  navigate: vi.fn(),
  useFetchList: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof LobeUI>()),
  // Renders the card right away and opens the popover through its first trigger click.
  Popover: ({
    children,
    content,
    onOpenChange,
  }: {
    children: ReactNode;
    content: ReactNode;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <button onClick={() => onOpenChange(true)}>trigger</button>
      {children}
      {content}
    </div>
  ),
}));
vi.mock('./index', () => ({
  default: ({ children, onHeaderClick }: { children?: ReactNode; onHeaderClick?: () => void }) => (
    <>
      {onHeaderClick ? <button onClick={onHeaderClick}>header</button> : <span>header</span>}
      {children}
    </>
  ),
}));
vi.mock('./AgentCardActions', () => ({
  AgentCardActions: ({ canMessage, profileUrl }: { canMessage?: boolean; profileUrl: string }) => (
    <span>
      actions:{profileUrl}
      {canMessage === false && ':profile-only'}
    </span>
  ),
}));
vi.mock('./useAgentProfileDetail', () => ({
  useAgentProfileDetail: () => ({ detail: detail.current, isLoading: false }),
}));
vi.mock('@/features/ResourcePermission/useResourceAccess', () => ({
  useResourceAccess: () => ({ canEditResource: false, isAccessResolved: true }),
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ allowed: false }) }));
vi.mock('@/store/home', () => ({
  useHomeStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/home/selectors', () => ({
  homeAgentListSelectors: { getAgentById: () => () => undefined },
}));
vi.mock('@/store/contact', () => ({
  contactActions: { useFetchList },
  contactSelectors: {
    agentById: (id: string) => () => (id === 'agt_shared' ? { agent: { agentId: id } } : undefined),
  },
  useContactStore: (selector: (s: unknown) => unknown) => selector({}),
}));

beforeEach(() => {
  detail.current = undefined;
  navigate.mockClear();
  useFetchList.mockClear();
});

describe('AgentProfilePopup', () => {
  // Contacts loaded only with the Contacts tab, so before it was opened a shared Agent's card
  // had nothing to link to.
  it('loads Contacts once the card opens', () => {
    render(
      <AgentProfilePopup agentId={'agt_shared'} trigger={'hover'}>
        <span />
      </AgentProfilePopup>,
    );
    expect(useFetchList).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByText('trigger'));

    expect(useFetchList).toHaveBeenLastCalledWith(true);
  });

  it('opens a contact Agent on its Contacts page', () => {
    render(
      <AgentProfilePopup agentId={'agt_shared'} trigger={'hover'}>
        <span />
      </AgentProfilePopup>,
    );

    fireEvent.click(screen.getByText('header'));

    expect(navigate).toHaveBeenCalledWith('/agents/agt_shared');
  });

  it('offers message and profile actions for an Agent the person can talk to', () => {
    render(
      <AgentProfilePopup agentId={'agt_shared'} trigger={'hover'}>
        <span />
      </AgentProfilePopup>,
    );

    expect(screen.getByText('actions:/agents/agt_shared')).toBeTruthy();
  });

  // A contact card shares an Agent the reader may not have yet: its card leads to the share,
  // where it can be added, and offers no conversation the server would refuse.
  it('opens an Agent outside Contacts through its share, without messaging', () => {
    render(
      <AgentProfilePopup
        agentId={'agt_stranger'}
        shareUrl={'/agents/shared/shr_1'}
        trigger={'hover'}
      >
        <span />
      </AgentProfilePopup>,
    );

    expect(screen.getByText('actions:/agents/shared/shr_1:profile-only')).toBeTruthy();
    fireEvent.click(screen.getByText('header'));
    expect(navigate).toHaveBeenCalledWith('/agents/shared/shr_1');
  });

  it('keeps a contact Agent on its Contacts page even with a share', () => {
    render(
      <AgentProfilePopup agentId={'agt_shared'} shareUrl={'/agents/shared/shr_1'} trigger={'hover'}>
        <span />
      </AgentProfilePopup>,
    );

    expect(screen.getByText('actions:/agents/agt_shared')).toBeTruthy();
  });

  it('lines runtime, device and directory up in one list', () => {
    detail.current = { agencyConfig: { heterogeneousProvider: { type: 'desk-runtime' } } };

    render(
      <AgentProfilePopup
        agentId={'agt_stranger'}
        trigger={'hover'}
        environment={{
          deviceId: 'dev_1',
          deviceName: 'JP node',
          workingDirectory: '/work/develop/lobehub',
        }}
      >
        <span />
      </AgentProfilePopup>,
    );

    const meta = screen.getByTestId('agent-meta');
    expect(meta.contains(screen.getByText('desk-runtime'))).toBe(true);
    expect(meta.contains(screen.getByText('JP node'))).toBe(true);
    expect(meta.contains(screen.getByText('…/develop/lobehub'))).toBe(true);
    expect(meta.contains(screen.getByText('agentProfile.runtimeLabel'))).toBe(true);
    expect(meta.contains(screen.getByText('agentProfile.deviceLabel'))).toBe(true);
    expect(meta.contains(screen.getByText('agentProfile.directoryLabel'))).toBe(true);
    // Icon, label and value for each of the three rows.
    expect(meta.childElementCount).toBe(9);
  });

  it('offers no actions for an Agent the person cannot open a conversation with', () => {
    render(
      <AgentProfilePopup agentId={'agt_stranger'} trigger={'hover'}>
        <span />
      </AgentProfilePopup>,
    );

    expect(screen.queryByText(/^actions:/)).toBeNull();
  });
});
