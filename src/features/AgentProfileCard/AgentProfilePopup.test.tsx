/**
 * @vitest-environment happy-dom
 */
import type * as LobeUI from '@lobehub/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentProfilePopup from './AgentProfilePopup';

const { navigate, useFetchList } = vi.hoisted(() => ({
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
  default: ({ onHeaderClick }: { onHeaderClick?: () => void }) =>
    onHeaderClick ? <button onClick={onHeaderClick}>header</button> : <span>header</span>,
}));
vi.mock('./useAgentProfileDetail', () => ({
  useAgentProfileDetail: () => ({ detail: undefined, isLoading: false }),
}));
vi.mock('@/features/Channels/useChannelsEnabled', () => ({ useChannelsEnabled: () => true }));
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
});
