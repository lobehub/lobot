/**
 * @vitest-environment happy-dom
 */
import type { ChannelPublicMember } from '@lobot/types';
import { render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MemberProfilePopup, PersonProfileCard } from './MemberProfilePopup';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en-US' },
    t: (key: string, options?: { date?: string }) =>
      options?.date ? `${key}:${options.date}` : key,
  }),
}));
vi.mock('./MemberAvatar', () => ({ MemberAvatar: () => null }));
vi.mock('./PersonAction', () => ({
  PersonAction: ({ userId }: { userId: string }) =>
    createElement('div', { 'data-testid': 'person-action', 'data-user-id': userId }),
}));
vi.mock('@/components/Avatar', () => ({ default: () => null }));
vi.mock('@/features/AgentProfileCard/AgentProfilePopup', () => ({
  default: ({ agentId, children }: { agentId: string; children: ReactNode }) =>
    createElement(
      'div',
      { 'data-agent-id': agentId, 'data-testid': 'agent-profile-popup' },
      children,
    ),
}));

const person = {
  actorType: 'user',
  agentId: null,
  id: 'mem_ann',
  joinedAt: new Date('2026-11-03T10:00:00Z'),
  userId: 'user-ann',
  userName: 'Ann Lee',
  username: 'ann',
} as unknown as ChannelPublicMember;

describe('PersonProfileCard', () => {
  it('shows the name, handle and when they joined', () => {
    render(<PersonProfileCard member={person} />);

    expect(screen.getByText('Ann Lee')).toBeTruthy();
    expect(screen.getByText('@ann')).toBeTruthy();
    expect(screen.getByText('memberProfile.joinedAt:November 3, 2026')).toBeTruthy();
  });

  // A handle matching the name was hidden, so one card had the line and the next did not.
  it('shows the handle even when it matches the name', () => {
    render(<PersonProfileCard member={{ ...person, userName: 'Ann', username: 'ann' }} />);

    expect(screen.getByText('Ann')).toBeTruthy();
    expect(screen.getByText('@ann')).toBeTruthy();
  });

  it('offers the action for the person behind the card', () => {
    render(<PersonProfileCard member={person} />);

    expect(screen.getByTestId('person-action').dataset.userId).toBe('user-ann');
  });

  it('offers no action for a deleted account', () => {
    render(<PersonProfileCard member={{ ...person, userId: null }} />);

    expect(screen.queryByTestId('person-action')).toBeNull();
  });

  it('leaves the handle out for a person without one', () => {
    render(<PersonProfileCard member={{ ...person, username: null }} />);

    expect(screen.getByText('Ann Lee')).toBeTruthy();
    expect(screen.queryByText(/^@/)).toBeNull();
  });
});

describe('MemberProfilePopup', () => {
  it('hands an Agent to its own profile card', () => {
    render(
      <MemberProfilePopup member={{ ...person, actorType: 'agent', agentId: 'agt_1' }}>
        <span>Coco</span>
      </MemberProfilePopup>,
    );

    expect(screen.getByTestId('agent-profile-popup').dataset.agentId).toBe('agt_1');
  });

  it('leaves the trigger alone without a member', () => {
    const { container } = render(
      <MemberProfilePopup member={undefined}>
        <span>Ann</span>
      </MemberProfilePopup>,
    );

    expect(container.innerHTML).toBe('<span>Ann</span>');
  });
});
