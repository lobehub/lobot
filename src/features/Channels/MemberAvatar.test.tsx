/**
 * @vitest-environment happy-dom
 */
import type { ChannelPublicMember } from '@lobot/types';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MemberAvatar } from './MemberAvatar';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: object) => unknown) => selector({}),
}));
vi.mock('@/store/user/selectors', () => ({ userProfileSelectors: { userId: () => 'self' } }));
vi.mock('@/features/User/UserAvatar', () => ({ default: () => null }));
vi.mock('@/components/AgentAvatar', () => ({ default: () => null }));
vi.mock('@/components/UserAvatar', () => ({
  default: ({ avatar, name }: { avatar?: string; name?: string }) =>
    createElement('span', {
      'data-avatar': avatar ?? '',
      'data-name': name,
      'data-testid': 'person-avatar',
    }),
}));

describe('MemberAvatar', () => {
  // The message list draws an image-less person as the pixel avatar generated from their name;
  // the Channel drew a stock 😀 for the same person.
  it('draws a person without an image as the avatar generated from their name', () => {
    const member = {
      actorType: 'user',
      id: 'mem_lu',
      userAvatar: null,
      userId: 'user-lu',
      userName: '陆肯',
    } as unknown as ChannelPublicMember;

    render(<MemberAvatar member={member} size={36} />);

    const avatar = screen.getByTestId('person-avatar');
    expect(avatar.dataset.avatar).toBe('');
    expect(avatar.dataset.name).toBe('陆肯');
  });
});
