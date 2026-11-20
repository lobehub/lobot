/**
 * @vitest-environment happy-dom
 */
import type { ChannelPublicMember } from '@lobot/types';
import { fireEvent, render, screen } from '@testing-library/react';
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
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@lobehub/ui', async (original) => ({
  ...(await original<object>()),
  // The menu's items as plain buttons, so a test can pick one without opening a popup.
  DropdownMenu: ({
    items,
  }: {
    items: Array<{ key: string; label: string; onClick: () => void }>;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'person-menu' },
      items.map((item) =>
        createElement(
          'button',
          { key: item.key, onClick: item.onClick, type: 'button' },
          item.label,
        ),
      ),
    ),
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

  it('opens the full profile from its menu, closing the card first', () => {
    const onClose = vi.fn();
    render(<PersonProfileCard member={person} onClose={onClose} />);

    fireEvent.click(screen.getByText('contacts.viewProfile'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/agents/people/user-ann');
  });

  it('has no menu for a deleted account', () => {
    render(<PersonProfileCard member={{ ...person, userId: null }} />);

    expect(screen.queryByTestId('person-menu')).toBeNull();
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

    // A feed shows many of these; the card mounts once its trigger is first pointed at.
    expect(screen.queryByTestId('agent-profile-popup')).toBeNull();
    fireEvent.pointerEnter(screen.getByText('Coco'));

    expect(screen.getByTestId('agent-profile-popup').dataset.agentId).toBe('agt_1');
  });

  it('mounts the card when keyboard focus reaches its trigger', () => {
    render(
      <MemberProfilePopup member={{ ...person, actorType: 'agent', agentId: 'agt_1' }}>
        <span>Coco</span>
      </MemberProfilePopup>,
    );

    fireEvent.focus(screen.getByText('Coco'));
    expect(screen.getByTestId('agent-profile-popup')).toBeTruthy();
  });

  it('opens an Agent card on click instead of hover', () => {
    render(
      <MemberProfilePopup
        member={{ ...person, actorType: 'agent', agentId: 'agt_1' }}
        trigger={'click'}
      >
        <span>Coco</span>
      </MemberProfilePopup>,
    );

    fireEvent.pointerEnter(screen.getByText('Coco'));
    expect(screen.queryByTestId('agent-profile-popup')).toBeNull();

    fireEvent.click(screen.getByText('Coco'));
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
