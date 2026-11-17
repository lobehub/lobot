/**
 * @vitest-environment happy-dom
 */
import type { ChannelListItem } from '@lobechat/types';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ChannelConversation from './ChannelConversation';

const store = vi.hoisted(() => ({
  project: undefined as { id: string; name: string } | undefined,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/Channels/useChannelMenu', () => ({ useChannelMenu: () => () => [] }));
vi.mock('@/store/project', () => ({
  projectListItemSelector: () => () => store.project,
  useProjectStore: (selector: () => unknown) => selector(),
}));
vi.mock('@/features/Projects/ProjectAvatar', () => ({
  default: () => createElement('span', { 'data-testid': 'project-avatar' }),
}));
vi.mock('@/features/GroupAvatar', () => ({
  default: ({ avatars }: { avatars: { seed: string }[] }) =>
    createElement('span', {
      'data-members': avatars.map((avatar) => avatar.seed).join(','),
      'data-testid': 'group-avatar',
    }),
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => () => {},
}));
vi.mock('@/features/Workspace/WorkspaceLink', () => ({
  default: ({ to: _to, ...rest }: { to: string }) => createElement('a', rest),
}));

const channel = (patch: Partial<ChannelListItem>) =>
  ({ id: 'chn_1', projectId: null, title: 'Marketing', ...patch }) as ChannelListItem;
const renderRow = (item: ChannelListItem) =>
  render(
    createElement(ChannelConversation, { active: false, activeAt: new Date(), channel: item }),
  );
const member = (id: string) => ({
  actorType: 'agent' as const,
  avatar: null,
  backgroundColor: null,
  id,
  name: id,
});

describe('ChannelConversation avatar', () => {
  it('pictures the members of a standalone Channel', () => {
    store.project = undefined;
    renderRow(channel({ memberAvatars: [member('agt_a'), member('agt_b')] }));
    expect(screen.getByTestId('group-avatar').dataset.members).toBe('agt_a,agt_b');
  });

  it('keeps "#" while no one else has joined', () => {
    store.project = undefined;
    renderRow(channel({ memberAvatars: [] }));
    expect(screen.queryByTestId('group-avatar')).toBeNull();
  });

  it('keeps the project logo for a project Channel', () => {
    store.project = { id: 'prj_1', name: 'Project' };
    renderRow(channel({ memberAvatars: [member('agt_a')], projectId: 'prj_1' }));
    expect(screen.getByTestId('project-avatar')).toBeTruthy();
    expect(screen.queryByTestId('group-avatar')).toBeNull();
  });
});

describe('ChannelConversation project title', () => {
  it("names a project's General Channel after the project alone", () => {
    store.project = { id: 'prj_1', name: 'Lobe Write' };
    renderRow(channel({ memberAvatars: [], projectId: 'prj_1', title: 'General' }));
    expect(screen.getByText('Lobe Write')).toBeTruthy();
    expect(screen.queryByText('General')).toBeNull();
  });

  it('keeps a renamed project Channel apart by its own name', () => {
    store.project = { id: 'prj_1', name: 'Lobe Write' };
    renderRow(channel({ memberAvatars: [], projectId: 'prj_1', title: 'Launch' }));
    expect(screen.getByText('Lobe Write')).toBeTruthy();
    expect(screen.getByText('Launch')).toBeTruthy();
  });

  it('names a standalone Channel by its own title', () => {
    store.project = undefined;
    renderRow(channel({ memberAvatars: [], title: 'Marketing' }));
    expect(screen.getByText('Marketing')).toBeTruthy();
  });
});

describe('ChannelConversation shared Agent', () => {
  it("tags another person's Agent as shared", () => {
    store.project = undefined;
    renderRow(channel({ memberAvatars: [member('agt_x')], sharedAgent: true }));
    expect(screen.getByText('sharedAgent.tag')).toBeTruthy();
  });

  it('leaves a group Channel untagged', () => {
    store.project = undefined;
    renderRow(channel({ memberAvatars: [member('agt_a')] }));
    expect(screen.queryByText('sharedAgent.tag')).toBeNull();
  });
});

describe('ChannelConversation mention marker', () => {
  const lastMessage = {
    content: 'take a look',
    createdAt: new Date(),
  } as ChannelListItem['lastMessage'];

  it('opens the preview with "[@me]" while an unread message mentions me', () => {
    store.project = undefined;
    renderRow(channel({ lastMessage, memberAvatars: [member('agt_a')], mentionCount: 2 }));
    expect(screen.getByText('mentionedYou')).toBeTruthy();
    expect(screen.getByText('take a look')).toBeTruthy();
  });

  it('marks a conversation with one person too', () => {
    store.project = undefined;
    renderRow(
      channel({
        lastMessage,
        memberAvatars: [{ ...member('usr_b'), actorType: 'user' }],
        mentionCount: 1,
        peerUserId: 'usr_b',
      }),
    );
    expect(screen.getByText('mentionedYou')).toBeTruthy();
  });

  it('shows no marker without unread mentions', () => {
    store.project = undefined;
    renderRow(channel({ lastMessage, memberAvatars: [member('agt_a')], mentionCount: 0 }));
    expect(screen.queryByText('mentionedYou')).toBeNull();
  });

  it('drops the marker on the open conversation, which is being read', () => {
    store.project = undefined;
    render(
      createElement(ChannelConversation, {
        active: true,
        activeAt: new Date(),
        channel: channel({ lastMessage, memberAvatars: [member('agt_a')], mentionCount: 1 }),
      }),
    );
    expect(screen.queryByText('mentionedYou')).toBeNull();
  });
});
