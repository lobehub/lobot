/**
 * @vitest-environment happy-dom
 */
import type {
  ChannelDetail,
  ChannelPublicJob,
  ChannelPublicMessage,
  ChannelReplyError,
} from '@lobot/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { messageReplyError, withoutReplyErrorCards } from './replyError';
import { ReplyErrorCard } from './ReplyErrorCard';

const resumeJob = vi.fn();
const retryJob = vi.fn();
const openEnvironment = vi.fn();
const openInWebApp = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  }),
}));
vi.mock('@lobehub/ui', () => ({
  Button: ({
    children,
    onClick,
    type,
  }: {
    children?: unknown;
    onClick?: () => void;
    type?: string;
  }) => createElement('button', { 'data-type': type, onClick }, children as never),
  Flexbox: ({ children }: { children?: unknown }) => createElement('div', {}, children as never),
  Icon: () => null,
  Text: ({ children }: { children?: unknown }) => createElement('span', {}, children as never),
}));
vi.mock('@/components/AsyncError', () => ({ default: () => null }));
vi.mock('@/store/channel', () => ({
  channelActions: {
    resumeJob: (...args: unknown[]) => resumeJob(...args),
    retryJob: (...args: unknown[]) => retryJob(...args),
  },
}));
vi.mock('@/features/Electron/navigation/webApp', () => ({
  openInWebApp: (path: string) => openInWebApp(path),
}));
vi.mock('./AgentEnvironment', () => ({
  openChannelAgentEnvironment: (...args: unknown[]) => openEnvironment(...args),
}));
vi.mock('./channelAccess', () => ({
  canManageAgents: (channel: { admin?: boolean }) => !!channel.admin,
}));

const replyError = (patch: Partial<ChannelReplyError> = {}): ChannelReplyError => ({
  actions: ['resume', 'retry', 'switch_device'],
  attempts: 1,
  errorMessage: 'socket hang up',
  errorType: 'DeviceGatewayNotConfigured',
  jobId: 'job_1',
  occurredAt: '2026-11-20T00:00:00.000Z',
  summary: 'The device stopped responding mid-reply.',
  ...patch,
});

const failedJob = (patch: Partial<ChannelPublicJob> = {}) =>
  ({
    blockedCode: null,
    canStop: true,
    errorMessage: 'socket hang up',
    id: 'job_1',
    memberId: 'mem_cc',
    messageId: 'msg_req',
    publicationRevoked: false,
    status: 'failed',
    threadId: null,
    topicId: 'tpc_1',
    writerHeld: false,
    ...patch,
  }) as ChannelPublicJob;

const detail = (jobs: ChannelPublicJob[], admin = false) =>
  ({
    channel: { admin, id: 'chn_1' },
    jobs,
    members: [{ agentId: 'agt_cc', id: 'mem_cc' }],
    messages: [],
  }) as unknown as ChannelDetail;

const renderCard = (jobs = [failedJob()], error = replyError(), admin = false) =>
  render(
    createElement(ReplyErrorCard, {
      detail: detail(jobs, admin),
      message: { agentId: 'agt_cc', threadId: null },
      replyError: error,
    }),
  );

const buttonLabels = () => screen.getAllByRole('button').map((button) => button.textContent);

describe('ReplyErrorCard', () => {
  beforeEach(() => {
    resumeJob.mockReset().mockResolvedValue(undefined);
    retryJob.mockReset().mockResolvedValue(undefined);
    openEnvironment.mockReset();
    openInWebApp.mockReset();
  });

  it('says what went wrong and offers the recommended action first', () => {
    renderCard([failedJob()], replyError(), true);
    expect(screen.getByText('The device stopped responding mid-reply.')).toBeTruthy();
    expect(buttonLabels()).toEqual([
      'replyError.resume',
      'receipt.retry',
      'replyError.switchDevice',
      'replyError.details',
      'receipt.openTopic',
    ]);
    expect(screen.getByText('replyError.resume').dataset.type).toBe('primary');
    expect(screen.getByText('receipt.retry').dataset.type).toBe('default');
  });

  it('keeps the server order, so a retry can lead', () => {
    renderCard([failedJob()], replyError({ actions: ['retry', 'resume'] }));
    expect(buttonLabels().slice(0, 2)).toEqual(['receipt.retry', 'replyError.resume']);
    expect(screen.getByText('receipt.retry').dataset.type).toBe('primary');
  });

  it('resumes in the same session or retries in a new one', async () => {
    const job = failedJob();
    renderCard([job]);
    fireEvent.click(screen.getByText('replyError.resume'));
    await waitFor(() => expect(resumeJob).toHaveBeenCalledWith('chn_1', job));
    fireEvent.click(screen.getByText('receipt.retry'));
    await waitFor(() => expect(retryJob).toHaveBeenCalledWith('chn_1', job));
  });

  it('lets only admins move the Agent to another device', () => {
    renderCard([failedJob()], replyError(), true);
    fireEvent.click(screen.getByText('replyError.switchDevice'));
    expect(openEnvironment).toHaveBeenCalledWith(
      'chn_1',
      expect.objectContaining({ id: 'mem_cc' }),
    );
  });

  it('hides switching device from members who cannot change it', () => {
    renderCard();
    expect(screen.queryByText('replyError.switchDevice')).toBeNull();
  });

  it('folds the raw diagnostic under details', () => {
    renderCard();
    expect(screen.queryByText(/socket hang up/)).toBeNull();
    fireEvent.click(screen.getByText('replyError.details'));
    expect(screen.getByText(/socket hang up/).textContent).toBe(
      'DeviceGatewayNotConfigured\nsocket hang up',
    );
  });

  it('counts attempts only after more than one', () => {
    renderCard([failedJob()], replyError({ attempts: 3 }));
    expect(screen.getByText('replyError.attempts:3')).toBeTruthy();
    renderCard([failedJob()], replyError({ attempts: 1 }));
    expect(screen.queryByText('replyError.attempts:1')).toBeNull();
  });

  it('opens the reply topic for the member who ran it', () => {
    renderCard();
    fireEvent.click(screen.getByText('receipt.openTopic'));
    expect(openInWebApp).toHaveBeenCalledWith('/agent/agt_cc/tpc_1');
  });

  it('becomes history once a newer reply settles the failure or it was retried', () => {
    renderCard([failedJob({ id: 'job_2', status: 'completed' }), failedJob()]);
    expect(screen.queryByText('replyError.resume')).toBeNull();
    expect(screen.queryByText('receipt.retry')).toBeNull();
  });

  it('offers no action to a viewer who may not stop the reply', () => {
    renderCard([failedJob({ canStop: false })]);
    expect(screen.queryByText('replyError.resume')).toBeNull();
  });
});

describe('messageReplyError', () => {
  const message = (fields: Partial<ChannelPublicMessage>) =>
    fields as Pick<ChannelPublicMessage, 'metadata' | 'replyError'>;

  it('reads the public field or the metadata, dropping unknown actions', () => {
    expect(messageReplyError(message({ replyError: replyError() }))?.jobId).toBe('job_1');
    expect(
      messageReplyError(
        message({
          metadata: {
            replyError: replyError({ actions: ['fly', 'retry'] as never }),
          },
        }),
      )?.actions,
    ).toEqual(['retry']);
  });

  it('leaves an ordinary or malformed message alone', () => {
    expect(messageReplyError(message({}))).toBeUndefined();
    expect(messageReplyError(message({ metadata: { replyError: { summary: 'x' } } }))).toBe(
      undefined,
    );
  });
});

describe('withoutReplyErrorCards', () => {
  it('drops the old failure receipt for a job the server posted a card for', () => {
    const jobs = [failedJob(), failedJob({ id: 'job_old', memberId: 'mem_other' })];
    expect(
      withoutReplyErrorCards(jobs, [{ replyError: replyError() }]).map((job) => job.id),
    ).toEqual(['job_old']);
  });

  it('keeps every receipt from a server that posts no cards', () => {
    const jobs = [failedJob()];
    expect(withoutReplyErrorCards(jobs, [{}])).toBe(jobs);
  });
});
