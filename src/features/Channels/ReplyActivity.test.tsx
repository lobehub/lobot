/**
 * @vitest-environment happy-dom
 */
import type { ChannelDetail, ChannelPublicJob } from '@lobot/types';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ReplyActivity } from './ReplyActivity';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en-US' },
    t: (key: string, options?: Record<string, unknown>) =>
      key === 'activity.one'
        ? `${options?.name} · ${options?.status}`
        : options?.count === undefined
          ? key
          : `${key}:${options.count}`,
  }),
}));
vi.mock('@lobehub/ui', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/AgentAvatar', () => ({ default: () => null }));
vi.mock('./MessageReceipts', () => ({
  ReplyList: () => null,
  replyEntries: (detail: ChannelDetail, jobs: ChannelPublicJob[]) =>
    jobs.map((job) => ({ job, name: job.memberId === 'mem_cook' ? 'Cook' : 'Nasa' })),
}));

const job = (patch: Partial<ChannelPublicJob> = {}) =>
  ({
    blockedCode: null,
    id: 'job_main',
    memberId: 'mem_cook',
    publicationRevoked: false,
    status: 'running',
    threadId: null,
    writerHeld: true,
    ...patch,
  }) as ChannelPublicJob;

const detail = (jobs: ChannelPublicJob[]) =>
  ({ channel: { id: 'chn_1' }, jobs, members: [], messages: [] }) as unknown as ChannelDetail;

describe('ReplyActivity', () => {
  it('says how many things a lone Agent works on across the conversation and its Threads', () => {
    render(
      <ReplyActivity
        threadId={null}
        detail={detail([
          job(),
          job({ id: 'job_t1', threadId: 'thr_1' }),
          job({ id: 'job_t2', status: 'queued', threadId: 'thr_2' }),
        ])}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('Cook · activity.parallel:3');
  });

  it('keeps the reply state while the Agent works in this conversation alone', () => {
    render(<ReplyActivity detail={detail([job()])} threadId={null} />);
    expect(screen.getByRole('status').textContent).toBe('Cook · status.running');
  });

  it("does not count another member's Threads", () => {
    render(
      <ReplyActivity
        detail={detail([job(), job({ id: 'job_t1', memberId: 'mem_nasa', threadId: 'thr_1' })])}
        threadId={null}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('Cook · status.running');
  });

  it('describes the head of the queue, not a newer request waiting behind it', () => {
    render(
      <ReplyActivity
        threadId={null}
        detail={detail([
          job({ id: 'job_new', status: 'queued', writerHeld: false }),
          job({ id: 'job_newer', status: 'queued', writerHeld: false }),
          job({
            blockedCode: 'device_offline',
            id: 'job_head',
            status: 'queued',
            writerHeld: false,
          }),
        ])}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('Cook · blocked.device_offline');
  });

  it('does not say the Agent is typing while its requests only wait in line', () => {
    render(
      <ReplyActivity
        threadId={null}
        detail={detail([
          job({ id: 'job_new', status: 'queued', writerHeld: false }),
          job({ blockedCode: 'member_busy', id: 'job_head', status: 'queued', writerHeld: false }),
        ])}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('Cook · blocked.member_busy');
  });
});
