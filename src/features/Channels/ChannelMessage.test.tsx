/**
 * @vitest-environment happy-dom
 */
import type { ChannelDetail, ChannelPublicMessage, ExternalWorkSummaryItem } from '@lobot/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { act, createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LobeAgentsElement from '@/features/Conversation/Markdown/plugins/LobeAgents';
import LocalFileElement from '@/features/Conversation/Markdown/plugins/LocalFile';
import EntityLinkElement from '@/features/EntityLink/element';

import { ChannelMessage } from './ChannelMessage';
import { CHANNEL_MENTION_TAG } from './mentionMarkdown';
import { CHANNEL_THREAD_REF_TAG, remarkChannelThreadRefs } from './threadRefMarkdown';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en-US' }, t: (key: string) => key }),
}));
vi.mock('@/features/Conversation/ChatItem', () => ({
  // Renders the avatar, title addon and message slots, the way ChatItem hands them over.
  ChatItem: ({
    customAvatarRender,
    message,
    titleAddon,
  }: {
    customAvatarRender: (a: unknown, n: ReactNode) => ReactNode;
    message: ReactNode;
    titleAddon?: ReactNode;
  }) =>
    createElement(
      'div',
      {},
      customAvatarRender({}, createElement('img', { alt: 'avatar' })),
      createElement('header', {}, titleAddon),
      message,
    ),
}));
vi.mock('@/features/AgentProfileCard/AgentProfilePopup', () => ({
  default: ({
    agentId,
    agent,
    children,
    trigger,
  }: {
    agent?: { description?: string };
    agentId: string;
    children: ReactNode;
    trigger?: string;
  }) =>
    createElement(
      'div',
      {
        'data-agent-id': agentId,
        'data-description': agent?.description,
        'data-testid': 'agent-profile-popup',
        'data-trigger': trigger,
      },
      children,
    ),
}));
const confirmModal = vi.hoisted(() => vi.fn());
vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirmModal,
  DropdownMenu: ({ items }: { items: { key: string; label: string; onClick: () => void }[] }) =>
    createElement(
      'div',
      {},
      items.map((item) =>
        createElement('button', { key: item.key, onClick: item.onClick }, item.label),
      ),
    ),
}));
const collapsibleProps = vi.hoisted(() => ({ current: undefined as any }));
vi.mock('@/components/CollapsibleContent', () => ({
  default: (props: { children: ReactNode }) => {
    collapsibleProps.current = props;
    return props.children;
  },
}));
const markdownProps = vi.hoisted(() => ({ current: undefined as any }));
vi.mock('@/features/Conversation/Markdown', () => ({
  default: (props: unknown) => {
    markdownProps.current = props;
    return null;
  },
}));
vi.mock('@/features/LocalFile', () => ({
  LocalFile: ({ name, readonly }: { name: string; readonly?: boolean }) =>
    createElement('span', { 'data-readonly': String(!!readonly) }, name),
}));
vi.mock('@/components/AgentAvatar', () => ({
  default: ({ name }: { name?: string }) => createElement('i', { 'data-agent-avatar': name }),
}));
vi.mock('@/components/Avatar', () => ({
  default: ({ title }: { title?: string }) => createElement('img', { alt: 'avatar', title }),
}));
vi.mock('@/features/User/UserAvatar', () => ({ default: () => createElement('i', {}, 'me') }));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: { userId: () => 'user-self' },
}));
vi.mock('./MemberProfilePopup', () => ({
  MemberProfilePopup: ({ children, member }: { children: ReactNode; member?: { id: string } }) =>
    createElement('div', { 'data-member-id': member?.id, 'data-testid': 'member-popup' }, children),
}));
const editMessage = vi.hoisted(() => vi.fn());
const deleteMessage = vi.hoisted(() => vi.fn());
vi.mock('@/store/channel', () => ({ channelActions: { deleteMessage, editMessage } }));
vi.mock('./MessageAttachments', () => ({ MessageAttachments: () => null }));
vi.mock('./ThreadRef', () => ({
  ThreadRef: ({
    channelId,
    onOpenThread,
    threadId,
  }: {
    channelId: string;
    onOpenThread?: (id: string) => void;
    threadId: string;
  }) =>
    createElement(
      'button',
      { 'data-channel-id': channelId, 'onClick': () => onOpenThread?.(threadId) },
      `ref:${threadId}`,
    ),
}));
vi.mock('./MessageReceipts', () => ({
  MessageRoutingStatus: () => null,
}));

const detail = {
  attachments: [],
  channel: { agentId: null, id: 'chn_1' },
  jobs: [],
  members: [
    { agentId: 'agt_1', description: 'Architect', id: 'mem_1' },
    { actorType: 'user', agentId: null, id: 'mem_ann', userId: 'user-other', userName: 'Ann' },
  ],
  threads: [],
} as unknown as ChannelDetail;

const message = (author: ChannelPublicMessage['author']) =>
  ({
    author,
    content: '',
    createdAt: new Date('2026-11-07T10:18:00Z'),
    fileIds: [],
    id: 'msg_1',
    mentions: [],
    routingStatus: author.type === 'agent' ? 'reply' : 'routed',
  }) as unknown as ChannelPublicMessage;

// Without hover (touch) the message toolbar is always visible, so it mounts with the row; the
// tests below act on it directly. `ChannelMessage toolbar` covers the hover-capable path.
let hoverCapable = false;
beforeEach(() => {
  hoverCapable = false;
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({ matches: hoverCapable && query === '(hover: hover)' }) as MediaQueryList,
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ChannelMessage avatar', () => {
  it('shows the Agent profile card when hovering an Agent author', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' })}
      />,
    );

    // The card mounts once its avatar is first pointed at.
    expect(screen.queryByTestId('agent-profile-popup')).toBeNull();
    fireEvent.pointerEnter(document.querySelector('[data-agent-avatar="Sanjo"]')!.parentElement!);

    const popup = screen.getByTestId('agent-profile-popup');
    expect(popup.dataset.agentId).toBe('agt_1');
    expect(popup.dataset.trigger).toBe('hover');
    expect(popup.dataset.description).toBe('Architect');

    // `avatar` is the message bubble's default image, which falls back to the legacy default.
    expect(screen.queryByAltText('avatar')).toBeNull();
  });

  it('shows the person’s profile card when hovering a human author', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={message({ avatar: null, id: 'user-other', name: 'Ann', type: 'user' })}
      />,
    );

    expect(screen.queryByTestId('agent-profile-popup')).toBeNull();
    const popup = screen.getByTestId('member-popup');
    expect(popup.dataset.memberId).toBe('mem_ann');
    expect(popup.querySelector('img[alt="avatar"]')).toBeTruthy();
  });

  it('shows the person’s profile card when hovering a mention of them', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={{
          ...message({ avatar: null, id: 'user-self', name: 'Me', type: 'user' }),
          content: '@Ann can you check?',
          mentions: ['mem_ann'],
        }}
      />,
    );

    const Mention = markdownProps.current.components[CHANNEL_MENTION_TAG];
    render(<Mention name={'Ann'}>@Ann</Mention>);
    const chip = screen.getByText('@Ann');
    expect(chip.closest<HTMLElement>('[data-testid="member-popup"]')?.dataset.memberId).toBe(
      'mem_ann',
    );
  });
});

describe('ChannelMessage links', () => {
  it('renders links through the entity-link element, alongside mention chips', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={{
          ...message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' }),
          content: 'https://github.com/lobehub/lobehub/pull/22581',
        }}
      />,
    );

    expect(markdownProps.current.components[EntityLinkElement.tag]).toBe(
      EntityLinkElement.Component,
    );
    expect(markdownProps.current.components[CHANNEL_MENTION_TAG]).toBeDefined();
    expect(markdownProps.current.rehypePlugins).toContain(EntityLinkElement.rehypePlugin);
  });
});

describe('ChannelMessage Agent cards', () => {
  it('renders an Agent reply’s lobeAgents tag as the Agent card, kept on one line', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={{
          ...message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' }),
          content: 'Try this one:\n\n<lobeAgents identifier="agt_x"\n  title="Deck" />',
        }}
      />,
    );

    expect(markdownProps.current.components[LobeAgentsElement.tag]).toBe(
      LobeAgentsElement.Component,
    );
    expect(markdownProps.current.rehypePlugins).toContain(LobeAgentsElement.rehypePlugin);
    expect(markdownProps.current.children).toBe(
      'Try this one:\n\n<lobeAgents identifier="agt_x"  title="Deck" />',
    );
  });

  it('leaves the tag as text in a person’s message', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={{
          ...message({ avatar: null, id: 'user-other', name: 'Ann', type: 'user' }),
          content: '<lobeAgents identifier="agt_x" title="Deck" />',
        }}
      />,
    );

    expect(markdownProps.current.rehypePlugins).not.toContain(LobeAgentsElement.rehypePlugin);
  });
});

describe('ChannelMessage local files', () => {
  it('renders a localFile tag as a read-only file chip', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={{
          ...message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' }),
          content: 'Saved <localFile name="AGENTS.md" path="/Users/a/AGENTS.md" /> to my role.',
        }}
      />,
    );

    expect(markdownProps.current.remarkPlugins).toContain(LocalFileElement.remarkPlugin);
    const Chip = markdownProps.current.components[LocalFileElement.tag];
    const { container } = render(
      <Chip node={{ properties: { name: 'AGENTS.md', path: '/Users/a/AGENTS.md' } }} />,
    );
    expect(container.querySelector('span')?.textContent).toBe('AGENTS.md');
    expect(container.querySelector('span')?.dataset.readonly).toBe('true');
  });
});

describe('ChannelMessage collapse', () => {
  const longMessage = {
    ...message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' }),
    content: 'A long reply',
  };

  it('shows a recent long message in full and only offers collapsing from the more menu', () => {
    render(<ChannelMessage detail={detail} message={{ ...longMessage, createdAt: new Date() }} />);

    expect(collapsibleProps.current.collapsed).toBe(false);
    expect(collapsibleProps.current.hideCollapseToggle).toBe(true);
    expect(screen.queryByText('message.collapse')).toBeNull();

    act(() => collapsibleProps.current.onOverflowChange(true));
    fireEvent.click(screen.getByText('message.collapse'));

    expect(collapsibleProps.current.collapsed).toBe(true);
    expect(screen.getByText('message.expand')).toBeTruthy();
  });

  it('folds a long message from before yesterday, even in a direct conversation', () => {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - 3);
    render(
      <ChannelMessage
        detail={{ ...detail, channel: { ...detail.channel, agentId: 'agt_1' } } as ChannelDetail}
        message={{ ...longMessage, createdAt }}
      />,
    );

    expect(collapsibleProps.current.collapsed).toBe(true);
    expect(collapsibleProps.current.overflowThreshold).toBeGreaterThan(0);
    expect(collapsibleProps.current.fade).toBe(false);

    act(() => collapsibleProps.current.onCollapsedChange(false));
    act(() => collapsibleProps.current.onOverflowChange(true));
    expect(collapsibleProps.current.collapsed).toBe(false);
    expect(screen.getByText('message.collapse')).toBeTruthy();
  });

  it('leaves a recent message open in a direct conversation', () => {
    collapsibleProps.current = undefined;
    render(
      <ChannelMessage
        detail={{ ...detail, channel: { ...detail.channel, agentId: 'agt_1' } } as ChannelDetail}
        message={{ ...longMessage, createdAt: new Date() }}
      />,
    );

    expect(collapsibleProps.current).toBeUndefined();
  });
});

describe('ChannelMessage works', () => {
  const url = 'https://github.com/lobehub/lobehub/pull/1';
  const work = {
    description: 'Adds the cards',
    event: {
      cumulativeCost: 0.42,
      cumulativeUsage: null,
      metadata: { baseBranch: 'canary', headBranch: 'feat/cards' },
    },
    id: url,
    identifier: 'lobehub/lobehub#1',
    resourceDeleted: false,
    resourceType: 'github_pull_request',
    status: 'open',
    title: 'Show works in channels',
    totalCost: 0.42,
    type: 'external',
    url,
  } as unknown as ExternalWorkSummaryItem;

  it('shows a reply’s external Works as cards that open their link', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(
      <ChannelMessage
        detail={detail}
        message={{
          ...message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' }),
          content: 'Opened it',
          works: [work],
        }}
      />,
    );

    expect(screen.getByText('Show works in channels')).toBeTruthy();
    expect(screen.getByText('lobehub/lobehub#1')).toBeTruthy();
    expect(screen.getByText('feat/cards')).toBeTruthy();
    expect(screen.getByText('0.42')).toBeTruthy();

    fireEvent.click(screen.getByText('Show works in channels'));
    expect(open).toHaveBeenCalledWith(url, '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('renders no cards without Works', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={{
          ...message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' }),
          works: [],
        }}
      />,
    );

    expect(screen.queryByText('Show works in channels')).toBeNull();
  });
});

describe('ChannelMessage thread references', () => {
  it('renders `<#cht_…>` as a chip that opens the thread, without reparsing on polls', () => {
    const onOpenThread = vi.fn();
    const agentMessage = {
      ...message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' }),
      content: '这个接着在这个 Thread 里说 <#cht_abc123>',
    };
    const { rerender } = render(
      <ChannelMessage detail={detail} message={agentMessage} onOpenThread={onOpenThread} />,
    );
    const { components, remarkPlugins } = markdownProps.current;
    expect(remarkPlugins).toContain(remarkChannelThreadRefs);

    const Ref = components[CHANNEL_THREAD_REF_TAG];
    render(<Ref threadId={'cht_abc123'} />);
    const chip = screen.getByText('ref:cht_abc123');
    expect(chip.dataset.channelId).toBe('chn_1');
    fireEvent.click(chip);
    expect(onOpenThread).toHaveBeenCalledWith('cht_abc123');

    // A poll hands over a new detail object; the Markdown inputs keep their identity.
    rerender(
      <ChannelMessage
        detail={{ ...detail, members: [...detail.members] }}
        message={agentMessage}
        onOpenThread={onOpenThread}
      />,
    );
    expect(markdownProps.current.components).toBe(components);
    expect(markdownProps.current.remarkPlugins).toBe(remarkPlugins);
  });
});

describe('ChannelMessage thread card', () => {
  const root = { ...message({ avatar: null, id: 'user-other', name: 'Ann', type: 'user' }) };
  const withThread = (thread: Record<string, unknown>) =>
    ({
      ...detail,
      threads: [{ followerMemberIds: [], id: 'cht_1', rootMessageId: root.id, ...thread }],
    }) as unknown as ChannelDetail;

  it('shows the title and reply count, then the latest reply, and opens the thread', () => {
    const onOpenThread = vi.fn();
    render(
      <ChannelMessage
        message={{ ...root, content: 'Topic header is unclickable\nmore detail' }}
        detail={withThread({
          lastReply: {
            author: { avatar: null, id: 'agt_1', name: 'Nasa', type: 'agent' },
            content: 'PR is up\nsecond line',
            createdAt: new Date(),
            id: 'msg_2',
          },
          replyCount: 5,
        })}
        onOpenThread={onOpenThread}
      />,
    );

    // Like Discord: the title and count on top, then who said what last, on one line.
    const entry = screen.getByRole('button', { name: /^Topic header is unclickable/ });
    expect(entry.firstElementChild?.textContent).toContain('Topic header is unclickable');
    expect(entry.firstElementChild?.textContent).toContain('threadCard.replies');
    expect(entry.lastElementChild?.textContent).toContain('Nasa');
    expect(screen.getByText('PR is up second line')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Topic header is unclickable/ }));
    expect(onOpenThread).toHaveBeenCalledWith('cht_1');
  });

  it('shows the Agent working in the thread in place of its latest reply', () => {
    render(
      <ChannelMessage
        message={root}
        detail={{
          ...withThread({
            lastReply: {
              author: { avatar: null, id: 'agt_1', name: 'Nasa', type: 'agent' },
              content: 'Earlier answer',
              createdAt: new Date(),
              id: 'msg_2',
            },
            replyCount: 2,
          }),
          jobs: [
            {
              blockedCode: null,
              id: 'job_1',
              memberId: 'mem_1',
              publicationRevoked: false,
              status: 'running',
              threadId: 'cht_1',
              writerHeld: true,
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole('status').textContent).toContain('activity.one');
    expect(screen.queryByText('Earlier answer')).toBeNull();
  });

  it('keeps the latest reply when the work is in another thread', () => {
    render(
      <ChannelMessage
        message={root}
        detail={{
          ...withThread({
            lastReply: {
              author: { avatar: null, id: 'agt_1', name: 'Nasa', type: 'agent' },
              content: 'Earlier answer',
              createdAt: new Date(),
              id: 'msg_2',
            },
            replyCount: 2,
          }),
          jobs: [
            {
              blockedCode: null,
              id: 'job_1',
              memberId: 'mem_1',
              publicationRevoked: false,
              status: 'running',
              threadId: 'cht_other',
              writerHeld: true,
            },
          ],
        }}
      />,
    );

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Earlier answer')).toBeTruthy();
  });

  it('shows the viewer’s own latest reply with their live avatar', () => {
    render(
      <ChannelMessage
        message={root}
        detail={withThread({
          lastReply: {
            author: { avatar: null, id: 'user-self', name: 'Me', type: 'user' },
            content: 'On it',
            createdAt: new Date(),
            id: 'msg_3',
          },
          replyCount: 1,
        })}
      />,
    );

    expect(screen.getByText('me')).toBeTruthy();
  });

  it('names the line after the title an Agent gave the thread', () => {
    render(
      <ChannelMessage
        detail={withThread({ replyCount: 1, title: 'Header click fix' })}
        message={{ ...root, content: 'Topic header is unclickable' }}
      />,
    );

    expect(screen.getByRole('button', { name: /^Header click fix/ })).toBeTruthy();
  });

  it('still offers the thread when a cached view has no summary', () => {
    render(<ChannelMessage detail={withThread({})} message={root} />);

    expect(screen.getByRole('button', { name: /^thread/ }).textContent).toContain('openThread');
    expect(screen.queryByText('threadCard.replies')).toBeNull();
  });
});

describe('ChannelMessage layout', () => {
  it('shows an Agent reply without an Agent badge', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={message({ avatar: null, id: 'agt_1', name: 'Cook', type: 'agent' })}
      />,
    );

    expect(screen.queryByText('agentBadge')).toBeNull();
  });

  it('puts your own message on the left with your avatar, like everyone else’s', () => {
    const { container } = render(
      <ChannelMessage
        detail={detail}
        message={message({ avatar: null, id: 'user-self', name: 'Me', type: 'user' })}
      />,
    );

    expect(screen.getByText('me')).toBeTruthy();
    expect(container.querySelector('header time')).toBeTruthy();
  });
});

describe('ChannelMessage relay', () => {
  const relayed = (extra: Partial<ChannelPublicMessage>) =>
    ({
      ...message({ avatar: null, id: 'user-self', name: 'Arvin', type: 'user' }),
      via: { agentId: 'agt_relay', avatar: null, name: 'Yunuo' },
      ...extra,
    }) as ChannelPublicMessage;

  it('names the relaying Agent in the header, after the time', () => {
    const { container } = render(<ChannelMessage detail={detail} message={relayed({})} />);

    const header = container.querySelector('header')!;
    expect(header.textContent).toContain('message.relayedBy');
    // The time comes first, then the relay label.
    expect(header.firstElementChild?.tagName).toBe('TIME');
    expect(header.querySelector('[data-agent-avatar="Yunuo"]')).toBeTruthy();
  });

  it('says whose reply a receipt brings back', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={relayed({
          receipt: { channelId: 'chn_2', channelTitle: 'Ops', messageId: 'msg_9' },
        })}
      />,
    );

    expect(screen.getByText('message.relayReplyFrom')).toBeTruthy();
    expect(screen.queryByText('message.relayedBy')).toBeNull();
  });

  it('shows nothing for a message nobody relayed', () => {
    render(
      <ChannelMessage
        detail={detail}
        message={message({ avatar: null, id: 'user-other', name: 'Ann', type: 'user' })}
      />,
    );

    expect(screen.queryByText('message.relayedBy')).toBeNull();
  });

  it('keeps the header on a relayed continuation so the label stays visible', () => {
    const { container } = render(
      <ChannelMessage continuation detail={detail} message={relayed({})} />,
    );

    expect(container.querySelector('[data-continuation]')).toBeNull();
    expect(screen.getByText('message.relayedBy')).toBeTruthy();
  });
});

describe('ChannelMessage editing', () => {
  const own = () => ({
    ...message({ avatar: null, id: 'user-self', name: 'Me', type: 'user' }),
    content: 'Helo',
  });

  it('offers editing only on the viewer’s own sent messages', () => {
    const { unmount } = render(
      <ChannelMessage
        detail={detail}
        message={{
          ...message({ avatar: null, id: 'user-other', name: 'Ann', type: 'user' }),
          content: 'Hi',
        }}
      />,
    );
    expect(screen.queryByText('message.edit')).toBeNull();
    unmount();

    render(<ChannelMessage pending detail={detail} message={own()} />);
    expect(screen.queryByText('message.edit')).toBeNull();
  });

  it('saves the new text on Enter and closes the editor', async () => {
    editMessage.mockResolvedValue(undefined);
    render(<ChannelMessage detail={detail} message={own()} />);

    fireEvent.click(screen.getByText('message.edit'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: ' Hello ' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(editMessage).toHaveBeenCalledWith('chn_1', 'msg_1', 'Hello');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('leaves the message as it was on Escape', () => {
    editMessage.mockClear();
    render(<ChannelMessage detail={detail} message={own()} />);

    fireEvent.click(screen.getByText('message.edit'));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(editMessage).not.toHaveBeenCalled();
  });

  it('marks an edited message as edited', () => {
    const { unmount } = render(<ChannelMessage detail={detail} message={own()} />);
    expect(screen.queryByText('message.edited')).toBeNull();
    unmount();

    render(
      <ChannelMessage
        detail={detail}
        message={{ ...own(), editedAt: new Date('2026-11-17T00:30:00Z') }}
      />,
    );
    expect(screen.getByText('message.edited')).toBeTruthy();
  });
});

describe('ChannelMessage deletion', () => {
  const by = (id: string, name: string) => ({
    ...message({ avatar: null, id, name, type: 'user' }),
    content: 'Oops',
  });
  const asAdmin = {
    ...detail,
    members: [
      ...detail.members,
      { actorType: 'user', id: 'mem_self', role: 'admin', userId: 'user-self' },
    ],
  } as unknown as ChannelDetail;

  it('offers deleting one’s own message, and anyone’s to an admin', () => {
    const { unmount } = render(
      <ChannelMessage detail={detail} message={by('user-other', 'Ann')} />,
    );
    expect(screen.queryByText('message.delete')).toBeNull();
    unmount();

    const own = render(<ChannelMessage detail={detail} message={by('user-self', 'Me')} />);
    expect(screen.getByText('message.delete')).toBeTruthy();
    own.unmount();

    render(
      <ChannelMessage
        detail={asAdmin}
        message={{
          ...message({ avatar: null, id: 'agt_1', name: 'Sanjo', type: 'agent' }),
          content: 'Done',
        }}
      />,
    );
    expect(screen.getByText('message.delete')).toBeTruthy();
  });

  it('deletes only after confirmation', async () => {
    deleteMessage.mockResolvedValue(undefined);
    render(<ChannelMessage detail={detail} message={by('user-self', 'Me')} />);

    fireEvent.click(screen.getByText('message.delete'));
    expect(deleteMessage).not.toHaveBeenCalled();
    await act(() => confirmModal.mock.calls.at(-1)[0].onOk());

    expect(deleteMessage).toHaveBeenCalledWith('chn_1', 'msg_1');
  });

  it('shows a deleted message as deleted, with nothing to act on', () => {
    render(
      <ChannelMessage
        detail={asAdmin}
        message={{ ...by('user-self', 'Me'), content: '', deletedAt: new Date() }}
        onReply={() => {}}
      />,
    );

    expect(screen.getByText('message.deleted')).toBeTruthy();
    expect(screen.queryByLabelText('reply.action')).toBeNull();
    expect(screen.queryByText('message.delete')).toBeNull();
  });
});

describe('ChannelMessage toolbar', () => {
  const own = {
    ...message({ avatar: null, id: 'user-self', name: 'Me', type: 'user' }),
    content: 'Oops',
  };

  it('mounts the hover toolbar only once the row is pointed at, and keeps it', () => {
    hoverCapable = true;
    render(<ChannelMessage detail={detail} message={own} />);
    expect(screen.queryByText('message.delete')).toBeNull();

    const row = screen.getByRole('article');
    fireEvent.pointerEnter(row);
    expect(screen.getByText('message.delete')).toBeTruthy();

    fireEvent.pointerLeave(row);
    expect(screen.getByText('message.delete')).toBeTruthy();
  });

  it('mounts it when keyboard focus enters the row', () => {
    hoverCapable = true;
    render(<ChannelMessage detail={detail} message={own} />);

    fireEvent.focus(screen.getByRole('article'));
    expect(screen.getByText('message.delete')).toBeTruthy();
  });
});
