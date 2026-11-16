/**
 * @vitest-environment happy-dom
 */
import type { ChannelPublicJob } from '@lobechat/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReplyDetail } from './MessageReceipts';

const retryJob = vi.fn();

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
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
vi.mock('./ChannelStatus', () => ({ ChannelStatus: () => null }));
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
