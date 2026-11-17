/**
 * @vitest-environment happy-dom
 */
import type { ChannelPublicMember } from '@lobot/types';
import { render, screen } from '@testing-library/react';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { JoinEventLine } from './JoinEventLine';

vi.mock('react-i18next', () => ({
  Trans: ({ components }: { components: { members: ReactElement } }) => components.members,
  useTranslation: () => ({ i18n: { language: 'en-US' }, t: (key: string) => key }),
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (state: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: { userId: () => 'user-1' },
}));
vi.mock('./MemberAvatar', () => ({ MemberAvatar: () => null }));
vi.mock('./MemberProfilePopup', () => ({
  MemberProfilePopup: ({ children, member }: { children: ReactNode; member: { id: string } }) =>
    createElement('div', { 'data-member-id': member.id, 'data-testid': 'member-popup' }, children),
}));

const member = (overrides: Partial<ChannelPublicMember>) =>
  ({ joinedAt: new Date(0), role: 'member', ...overrides }) as ChannelPublicMember;

describe('JoinEventLine', () => {
  it('shows the hover profile card for Agents and people alike', () => {
    render(
      <JoinEventLine
        event={{
          at: 0,
          id: 'join:a',
          members: [
            member({
              actorType: 'agent',
              agentId: 'agent-1',
              description: 'Writes code',
              id: 'a',
              name: 'Coco',
            }),
            member({ actorType: 'user', id: 'b', userId: 'user-2', userName: 'Ming' }),
          ],
        }}
      />,
    );

    const popups = screen.getAllByTestId('member-popup');
    expect(popups.map((popup) => [popup.dataset.memberId, popup.textContent])).toEqual([
      ['a', 'Coco'],
      ['b', 'Ming'],
    ]);
  });
});
