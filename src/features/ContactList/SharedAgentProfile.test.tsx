/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedAgentProfile } from './SharedAgentProfile';

const { addAgent, message, state } = vi.hoisted(() => ({
  addAgent: vi.fn(),
  message: vi.fn(),
  state: { shareMap: {} as Record<string, unknown[]> },
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/AgentAvatar', () => ({ default: () => null }));
vi.mock('./ContactInfo', () => ({
  ContactInfo: ({ slug }: { slug?: string | null }) => createElement('div', {}, `@${slug}`),
}));
vi.mock('./useMessageSharedAgent', () => ({
  useMessageSharedAgent: () => ({ message, opening: false }),
}));
vi.mock('@/store/contact', async (original) => ({
  ...(await original<object>()),
  contactActions: { addAgent, useFetchShare: () => ({ error: undefined, revalidate: vi.fn() }) },
  useContactStore: (selector: (s: object) => unknown) => selector(state),
}));

const agent = {
  agentId: 'agt_shared',
  avatar: null,
  backgroundColor: null,
  description: 'Writes plans',
  owner: { avatar: null, fullName: 'tj', id: 'u_tj', username: 'tj' },
  shareId: 'share-1',
  slug: 'wannuo',
  title: '晚诺',
};

const renderProfile = (): ReturnType<typeof render> =>
  render(
    createElement(
      MemoryRouter,
      { initialEntries: ['/agents/shared/wannuo'] },
      createElement(
        Routes,
        {},
        createElement(Route, {
          element: createElement(SharedAgentProfile, { share: 'wannuo' }),
          path: '/agents/shared/:share',
        }),
        createElement(Route, {
          element: createElement('div', {}, 'own card') as ReactNode,
          path: '/agents/:id',
        }),
      ),
    ),
  );

describe('SharedAgentProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.shareMap = {};
  });

  it('offers messaging and adding to contacts, without friendship', () => {
    state.shareMap = { wannuo: [{ agent, relation: 'none', type: 'agent' }] };
    renderProfile();

    expect(screen.getByText('晚诺')).toBeInTheDocument();
    expect(screen.getByText('@wannuo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('contacts.sendMessage'));
    expect(message).toHaveBeenCalledWith(agent);

    fireEvent.click(screen.getByText('contacts.agent.add'));
    expect(addAgent).toHaveBeenCalledWith('share-1');
  });

  it('shows an Agent already in contacts as added', () => {
    state.shareMap = { wannuo: [{ agent, relation: 'contact', type: 'agent' }] };
    renderProfile();

    expect(screen.getByText('contacts.agent.added').closest('button')).toBeDisabled();
  });

  it('opens one’s own Agent on its own card', async () => {
    state.shareMap = { wannuo: [{ agent, relation: 'self', type: 'agent' }] };
    renderProfile();

    await waitFor(() => expect(screen.getByText('own card')).toBeInTheDocument());
  });

  it('says so when the share resolves to no Agent', () => {
    state.shareMap = { wannuo: [] };
    renderProfile();

    expect(screen.getByText('contacts.agent.unavailable')).toBeInTheDocument();
  });
});
