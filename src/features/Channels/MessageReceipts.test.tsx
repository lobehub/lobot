/**
 * @vitest-environment happy-dom
 */
import type { ChannelPublicJob, ChannelPublicMessage } from '@lobot/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReplyEntry } from './MessageReceipts';
import { failureAnchors, ReplyDetail } from './MessageReceipts';

const retryJob = vi.fn();
const devices: Record<string, unknown> = {
  dev_1: { deviceId: 'dev_1', friendlyName: 'Studio Mac' },
};
const openInWebApp = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      options?.name ? `${key}:${options.name}` : key,
  }),
}));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ onClick, title }: { onClick?: () => void; title?: string }) =>
    createElement('button', { onClick }, title),
  Button: ({ children, onClick }: { children?: unknown; onClick?: () => void }) =>
    createElement('button', { onClick }, children as never),
  Flexbox: ({ children }: { children?: unknown }) => createElement('div', {}, children as never),
  Popover: ({ children }: { children?: unknown }) => children,
  Text: ({ children }: { children?: unknown }) => createElement('span', {}, children as never),
  usePopoverContext: () => ({ close: () => {} }),
}));
vi.mock('@/components/AgentAvatar', () => ({ default: () => null }));
vi.mock('@/components/AsyncError', () => ({ default: () => null }));
vi.mock('@/store/channel', () => ({
  channelActions: { retryJob: (...args: unknown[]) => retryJob(...args) },
}));
vi.mock('@/features/Electron/navigation/webApp', () => ({
  openInWebApp: (path: string) => openInWebApp(path),
}));
vi.mock('./ChannelStatus', () => ({
  ChannelStatus: ({ label }: { label: string }) =>
    createElement('span', { 'data-testid': 'status' }, label),
}));
vi.mock('./CreateChannel/EnvironmentFields', () => ({
  deviceLabel: (device: { friendlyName: string }) => device.friendlyName,
}));
vi.mock('@/store/device', () => ({
  deviceSelectors: {
    getDeviceById: (id?: string) => () => (id === 'dev_1' ? devices[id] : undefined),
  },
  useDeviceStore: (selector: (state: unknown) => unknown) => selector({}),
}));
vi.mock('./useOpenReplyAgent', () => ({ useOpenReplyAgent: () => () => {} }));
vi.mock('./BlockedDevice', () => ({
  BlockedDevice: ({ retry }: { retry?: unknown }) =>
    createElement('div', { 'data-testid': 'device' }, retry as never),
}));

const failedJob = (job: Partial<ChannelPublicJob> = {}) =>
  ({
    blockedCode: null,
    canStop: true,
    deviceId: 'dev_1',
    errorType: 'DeviceGatewayNotConfigured',
    id: 'job_1',
    status: 'failed',
    threadId: null,
    writerHeld: false,
    ...job,
  }) as ChannelPublicJob;

const renderReply = (job: ChannelPublicJob) =>
  render(createElement(ReplyDetail, { channelId: 'chn_1', entry: { job, name: 'Claude Code' } }));

describe('ReplyDetail retry', () => {
  beforeEach(() => retryJob.mockReset().mockResolvedValue(undefined));

  it('queues a reply that could not reach its device again', async () => {
    const job = failedJob();
    renderReply(job);
    fireEvent.click(screen.getByText('receipt.retry'));
    await waitFor(() => expect(retryJob).toHaveBeenCalledWith('chn_1', job));
  });

  it('offers no retry to a viewer who may not stop the reply', () => {
    renderReply(failedJob({ canStop: false }));
    expect(screen.queryByText('receipt.retry')).toBeNull();
  });

  it('offers no retry while the failed run is still being released', () => {
    renderReply(failedJob({ writerHeld: true }));
    expect(screen.queryByText('receipt.retry')).toBeNull();
  });
});

describe('ReplyDetail topic', () => {
  const runningJob = (job: Partial<ChannelPublicJob> = {}) =>
    failedJob({ errorType: null, status: 'running', ...job });
  const renderAgentReply = (job: ChannelPublicJob) =>
    render(
      createElement(ReplyDetail, {
        channelId: 'chn_1',
        entry: { agentId: 'agt_justin', job, name: 'Justin' },
      }),
    );

  beforeEach(() => openInWebApp.mockReset());

  // A reply at work showed only its status; its runner can now watch it in its topic.
  it('opens a running reply’s topic on LobeHub for the member who runs it', () => {
    renderAgentReply(runningJob({ topicId: 'tpc_1' }));

    fireEvent.click(screen.getByText('receipt.openTopic'));
    expect(openInWebApp).toHaveBeenCalledWith('/agent/agt_justin/tpc_1');
  });

  it('offers no topic to members who do not own it', () => {
    renderAgentReply(runningJob());

    expect(screen.queryByText('receipt.openTopic')).toBeNull();
  });
});

describe('failureAnchors', () => {
  const message = (id: string, fields: Partial<ChannelPublicMessage> = {}) =>
    ({
      agentId: null,
      author: { id: null },
      id,
      replyToId: null,
      ...fields,
    }) as ChannelPublicMessage;
  const entry = { agentId: 'agt_a', job: { memberId: 'mem_a', messageId: 'req' } } as ReplyEntry;

  it('follows what the failed Agent already said about the request', () => {
    const anchors = failureAnchors(
      [
        message('req'),
        message('ack', { agentId: 'agt_a', replyToId: 'req' }),
        message('other', { agentId: 'agt_b', replyToId: 'req' }),
        message('later'),
      ],
      [entry],
    );
    expect([...anchors.keys()]).toEqual(['ack']);
  });

  it('sits right after the request when the Agent said nothing', () => {
    const anchors = failureAnchors([message('req'), message('later')], [entry]);
    expect([...anchors.keys()]).toEqual(['req']);
  });
});

describe('ReplyDetail queue', () => {
  const queued = (job: Partial<ChannelPublicJob>) =>
    failedJob({ errorType: null, memberId: 'mem_cook', status: 'queued', ...job });
  const renderQueued = (job: ChannelPublicJob, queue: ChannelPublicJob[]) =>
    render(createElement(ReplyDetail, { channelId: 'chn_1', entry: { job, name: 'Cook' }, queue }));

  // Requests queued behind another reply of the same Agent read "Typing…" for an hour.
  it('says a request waits for the previous reply instead of typing', () => {
    const queue = [queued({ id: 'later' }), queued({ id: 'now', status: 'running' })];
    renderQueued(queue[0], queue);
    expect(screen.getByTestId('status').textContent).toBe('blocked.member_busy');
  });

  it('names the device the head of the queue waits for', () => {
    const queue = [
      queued({ deviceId: null, id: 'later' }),
      queued({ blockedCode: 'device_offline', deviceId: 'dev_1', id: 'head' }),
    ];
    renderQueued(queue[0], queue);
    expect(screen.getByTestId('status').textContent).toBe('queue.waitingDevice:Studio Mac');
  });
});
