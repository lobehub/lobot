/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useChannelStore } from '@/store/channel';

import AgentConversation from './AgentConversation';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/AgentAvatar', () => ({
  default: ({
    agentId,
    animated,
    avatar,
    state,
  }: {
    agentId: string;
    animated?: boolean;
    avatar?: string;
    state?: string;
  }) =>
    createElement(
      'span',
      { 'data-animated': String(!!animated), 'data-state': state, 'data-testid': 'agent-avatar' },
      `${agentId}:${avatar ?? 'generated'}`,
    ),
}));
const workspace = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  useActiveWorkspaceId: () => workspace.id,
}));
vi.mock('@/features/HomeSidebar/Body/Agent/List/AgentItem/useDropdownMenu', () => ({
  // An Agent's own menu ends with its Delete; the row must not clash with it.
  useAgentDropdownMenu: () => () => [{ key: 'delete', label: 'delete' }],
}));
vi.mock('@/features/Channels/useChannelMenu', () => ({
  useChannelMenu: () => (channel: { status?: string }) => [
    { key: 'copyId', label: 'copyId' },
    channel.status === 'archived'
      ? { key: 'unarchive', label: 'unarchive' }
      : { key: 'archive', label: 'archive' },
    { type: 'divider' },
    { key: 'delete', label: 'moveToTrash' },
  ],
}));
vi.mock('@/features/HomeSidebar/Body/Agent/List/usePreservedAgentUrl', () => ({
  usePreservedAgentUrl: (id: string) => `/agent/${id}`,
}));
vi.mock('@/features/HomeSidebar/Body/Agent/ModalProvider', () => ({
  useAgentModal: () => ({ openCreateGroupModal: () => {} }),
}));
vi.mock('@/hooks/usePrefetchAgent', () => ({ usePrefetchAgent: () => () => {} }));
const chat = vi.hoisted(() => ({ running: false }));
vi.mock('@/store/chat', () => ({ useChatStore: () => chat.running }));
vi.mock('@/store/chat/selectors', () => ({
  operationSelectors: { isAgentVisiblyRunning: () => () => false },
}));
vi.mock('./useAgentConversationLink', () => ({
  useAgentConversationLink: (_: string, url: string) => ({ url }),
}));
vi.mock('./ConversationRow', () => ({
  default: ({ activity, activityCount, avatar, contextMenuItems, title }: any) =>
    createElement(
      'div',
      {
        'data-activity': activity ?? 'none',
        'data-activity-count': activityCount ?? 0,
        'data-testid': 'row',
      },
      title,
      avatar as never,
      createElement(
        'span',
        { 'data-testid': 'menu' },
        (contextMenuItems?.() ?? []).map((item: any) => item.key ?? item.type).join(','),
      ),
    ),
}));

const conversation = (avatar?: string, channel?: { status?: string }) =>
  ({
    activeAt: new Date('2026-11-03'),
    ...(channel ? { channel: { id: 'cht_cook', title: 'Cook', unreadCount: 0, ...channel } } : {}),
    item: { avatar, id: 'agt_cook', name: 'Cook', title: 'Cook', type: 'agent' },
  }) as never;

describe('AgentConversation avatar', () => {
  // The row drew the legacy robot image while the agent's Channel showed its generated character.
  it('draws the agent avatar seeded by its id when it has no image of its own', () => {
    render(createElement(AgentConversation, { active: false, conversation: conversation() }));

    expect(screen.getByTestId('agent-avatar')).toHaveTextContent('agt_cook:generated');
    expect(screen.getByTestId('menu')).toHaveTextContent('delete');
    expect(screen.getByTestId('menu')).not.toHaveTextContent('channel-');
  });

  it('keeps an agent’s own image or emoji', () => {
    render(createElement(AgentConversation, { active: false, conversation: conversation('🍳') }));

    expect(screen.getByTestId('agent-avatar')).toHaveTextContent('agt_cook:🍳');
  });

  // A direct conversation is the chat with one Agent: it cannot be archived or trashed.
  it('offers no archive or trash for an open direct Channel', () => {
    render(
      createElement(AgentConversation, {
        active: false,
        conversation: conversation(undefined, {}),
      }),
    );

    expect(screen.getByTestId('menu').textContent).toBe('delete');
  });

  it('offers unarchive instead for an archived direct Channel', () => {
    render(
      createElement(AgentConversation, {
        active: false,
        conversation: conversation(undefined, { status: 'archived' }),
      }),
    );

    expect(screen.getByTestId('menu')).toHaveTextContent('channel-unarchive');
  });
});

// In a workspace the row carried the Agent's whole menu (open in new window, copy ID, rename,
// permissions, make private, delete); it now keeps only the conversation's own actions.
describe('AgentConversation menu in a workspace', () => {
  afterEach(() => {
    workspace.id = null;
  });

  it('keeps only the conversation actions', () => {
    workspace.id = 'ws_1';
    render(
      createElement(AgentConversation, {
        active: false,
        conversation: conversation(undefined, { status: 'archived' }),
      }),
    );

    expect(screen.getByTestId('menu').textContent).toBe('channel-unarchive');
  });

  it('leaves out the Agent menu even without a direct Channel', () => {
    workspace.id = 'ws_1';
    render(createElement(AgentConversation, { active: false, conversation: conversation() }));

    expect(screen.getByTestId('menu').textContent).toBe('');
  });
});

describe('AgentConversation reply activity', () => {
  const showReply = (job: Record<string, unknown>) =>
    useChannelStore.setState({
      detailMap: {
        'cht_cook:main:latest': {
          channel: { agentId: 'agt_cook', id: 'cht_cook' },
          jobs: [
            {
              id: 'job_1',
              memberId: 'mem_cook',
              publicationRevoked: false,
              threadId: null,
              writerHeld: false,
              ...job,
            },
          ],
          members: [],
          messages: [],
        },
      } as never,
    });

  // The header said "typing" while the row and its avatar stayed idle: the row only read chat
  // operations, and a direct Channel replies through Channel jobs.
  it('animates the avatar and says working while the direct Channel’s reply runs', () => {
    showReply({ status: 'running' });
    render(
      createElement(AgentConversation, { active: true, conversation: conversation(undefined, {}) }),
    );

    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-state', 'working');
    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-animated', 'true');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity', 'working');
  });

  // The row said "typing" while the composer said "working": both now name the reply's state.
  it('says typing while the reply is still being prepared', () => {
    showReply({ status: 'queued' });
    render(
      createElement(AgentConversation, { active: true, conversation: conversation(undefined, {}) }),
    );

    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-state', 'thinking');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity', 'typing');
  });

  it('shows a blocked reply as waiting', () => {
    showReply({ blockedCode: 'device_offline', status: 'queued' });
    render(
      createElement(AgentConversation, { active: true, conversation: conversation(undefined, {}) }),
    );

    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-state', 'waiting');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity', 'none');
  });

  it('stays idle once the reply settles', () => {
    showReply({ status: 'completed' });
    render(
      createElement(AgentConversation, { active: true, conversation: conversation(undefined, {}) }),
    );

    expect(screen.getByTestId('agent-avatar')).not.toHaveAttribute('data-state');
    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-animated', 'false');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity', 'none');
  });

  // A row whose conversation is not open used to stay idle; it now reads the list's jobs.
  it('reads a background row’s reply from the list instead of a cached view', () => {
    showReply({ status: 'completed' });
    render(
      createElement(AgentConversation, {
        active: false,
        conversation: conversation(undefined, {
          replyJobs: [
            {
              blockedCode: null,
              id: 'job_2',
              memberId: 'mem_cook',
              publicationRevoked: false,
              status: 'running',
              threadId: null,
              writerHeld: true,
            },
          ],
        } as never),
      }),
    );

    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-state', 'working');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity', 'working');
  });

  // The header said "working" while the row kept its last message: the Agent was replying in
  // two Threads and the row only read the main conversation.
  it('works and counts conversations while the Agent replies in Threads', () => {
    const running = (id: string, threadId: string) => ({
      blockedCode: null,
      id,
      memberId: 'mem_cook',
      publicationRevoked: false,
      status: 'running',
      threadId,
      writerHeld: true,
    });
    showReply({ status: 'completed' });
    render(
      createElement(AgentConversation, {
        active: false,
        conversation: conversation(undefined, {
          replyJobs: [running('job_a', 'thr_a'), running('job_b', 'thr_b')],
        } as never),
      }),
    );

    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-state', 'working');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity', 'working');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity-count', '2');
  });

  it('reads an open row’s Thread replies from its loaded view', () => {
    showReply({ status: 'running', threadId: 'thr_a' });
    render(
      createElement(AgentConversation, { active: true, conversation: conversation(undefined, {}) }),
    );

    expect(screen.getByTestId('row')).toHaveAttribute('data-activity', 'working');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity-count', '1');
  });

  // The row said typing while the Channel was idle: the Agent was running in its other topics.
  it('only animates the avatar while the Agent runs elsewhere', () => {
    showReply({ status: 'completed' });
    chat.running = true;
    render(
      createElement(AgentConversation, { active: true, conversation: conversation(undefined, {}) }),
    );
    chat.running = false;

    expect(screen.getByTestId('agent-avatar')).toHaveAttribute('data-state', 'working');
    expect(screen.getByTestId('row')).toHaveAttribute('data-activity', 'none');
  });
});
