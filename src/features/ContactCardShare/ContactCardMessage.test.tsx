/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactCardMessage } from './ContactCardMessage';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      options?.name ? `${key}:${options.name}` : key,
  }),
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/components/AgentAvatar', () => ({ default: () => null }));
vi.mock('@/components/UserAvatar', () => ({ default: () => null }));

beforeEach(() => navigate.mockClear());

describe('ContactCardMessage', () => {
  it('shows an Agent card with its owner and opens the shared profile', () => {
    render(
      <ContactCardMessage
        card={{
          agentId: 'agt_writer',
          avatar: null,
          backgroundColor: null,
          name: 'Writer',
          ownerName: 'Max',
          shareId: 'shr_1',
          type: 'agent',
        }}
      />,
    );

    expect(screen.getByText('Writer')).toBeTruthy();
    expect(screen.getByText('contactCard.agentOwner:Max')).toBeTruthy();
    expect(screen.getByText('contactCard.label.agent')).toBeTruthy();

    fireEvent.click(screen.getByTestId('contact-card'));
    expect(navigate).toHaveBeenCalledWith('/agents/shared/shr_1');
  });

  it('shows a person card by handle and opens the person', () => {
    render(
      <ContactCardMessage
        card={{ avatar: null, name: null, type: 'user', userId: 'user_ann', username: 'ann' }}
      />,
    );

    expect(screen.getAllByText('ann')).toBeTruthy();
    expect(screen.getByText('@ann')).toBeTruthy();

    fireEvent.click(screen.getByTestId('contact-card'));
    expect(navigate).toHaveBeenCalledWith('/agents/people/user_ann');
  });
});
