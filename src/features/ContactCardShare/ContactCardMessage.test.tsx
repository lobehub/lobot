/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ContactCardMessage } from './ContactCardMessage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      options?.name ? `${key}:${options.name}` : key,
  }),
}));
vi.mock('@lobehub/ui', () => ({
  Popover: ({
    children,
    content,
    open,
  }: {
    children: ReactNode;
    content: ReactNode;
    open?: boolean;
  }) => (
    <>
      {children}
      {open && content}
    </>
  ),
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock('@/components/AgentAvatar', () => ({ default: () => null }));
vi.mock('@/components/UserAvatar', () => ({ default: () => null }));
vi.mock('@/features/AgentProfileCard/AgentProfilePopup', () => ({
  default: ({
    agentId,
    children,
    open,
    shareUrl,
  }: {
    agentId: string;
    children: ReactNode;
    open?: boolean;
    shareUrl?: string;
  }) => (
    <>
      {children}
      {open && <span>{`agent-profile:${agentId}:${shareUrl}`}</span>}
    </>
  ),
}));
vi.mock('@/features/Channels/MemberProfilePopup', () => ({
  PersonCardFrame: ({ children, name }: { children: ReactNode; name: string }) => (
    <div data-testid={'person-profile'}>
      {name}
      {children}
    </div>
  ),
}));
vi.mock('@/features/Channels/PersonAction', () => ({
  PersonAction: ({ userId }: { userId: string }) => <span>{`person-action:${userId}`}</span>,
}));

describe('ContactCardMessage', () => {
  it('shows an Agent card with its owner and opens its profile card in place', () => {
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
    expect(screen.getByText('agent-profile:agt_writer:/agents/shared/shr_1')).toBeTruthy();
  });

  it('shows a person card by handle and opens their profile card in place', () => {
    render(
      <ContactCardMessage
        card={{ avatar: null, name: null, type: 'user', userId: 'user_ann', username: 'ann' }}
      />,
    );

    expect(screen.getAllByText('ann')).toBeTruthy();
    expect(screen.getByText('@ann')).toBeTruthy();

    expect(screen.queryByTestId('person-profile')).toBeNull();
    fireEvent.click(screen.getByTestId('contact-card'));
    expect(screen.getByTestId('person-profile')).toBeTruthy();
    expect(screen.getByText('person-action:user_ann')).toBeTruthy();
  });
});
