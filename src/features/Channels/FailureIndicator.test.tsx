/**
 * @vitest-environment happy-dom
 */
import type { ChannelDetail, ChannelPublicJob } from '@lobot/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FailureIndicator } from './FailureIndicator';
import { useSeenFailureStore } from './seenFailures';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ onClick, title }: { onClick?: () => void; title?: string }) =>
    createElement('button', { 'aria-label': title, onClick }),
  Button: ({
    'aria-label': label,
    children,
    onClick,
  }: {
    'aria-label'?: string;
    'children'?: unknown;
    'onClick'?: () => void;
  }) => createElement('button', { 'aria-label': label, onClick }, children as never),
  Flexbox: ({ children }: { children?: unknown }) => createElement('div', {}, children as never),
  Icon: () => null,
  // The content renders beside the trigger, so the rows can be read without opening it.
  Popover: ({ children, content }: { children?: unknown; content?: unknown }) =>
    createElement('div', {}, children as never, content as never),
  Text: ({ children }: { children?: unknown }) => createElement('span', {}, children as never),
  usePopoverContext: () => ({ close: () => {} }),
}));
vi.mock('@/components/AgentAvatar', () => ({ default: () => null }));
vi.mock('@/components/AsyncError', () => ({ default: () => null }));
vi.mock('@/store/channel', () => ({ channelActions: {} }));
vi.mock('@/features/Electron/navigation/webApp', () => ({ openInWebApp: () => {} }));
vi.mock('./ChannelStatus', () => ({
  ChannelStatus: ({ label }: { label: string }) =>
    createElement('span', { 'data-testid': 'status' }, label),
}));
vi.mock('./BlockedDevice', () => ({ BlockedDevice: () => null }));
vi.mock('./CreateChannel/EnvironmentFields', () => ({ deviceLabel: () => '' }));
vi.mock('@/store/device', () => ({
  deviceSelectors: { getDeviceById: () => () => undefined },
  useDeviceStore: (selector: (state: unknown) => unknown) => selector({}),
}));
vi.mock('./useOpenReplyAgent', () => ({ useOpenReplyAgent: () => () => {} }));

const REASON = "You've hit your weekly limit · resets 9am (Asia/Shanghai)";

const detail = {
  channel: { canDelete: false, id: 'chn_1', status: 'active' },
  jobs: [
    {
      blockedCode: null,
      canStop: false,
      errorMessage: REASON,
      id: 'job_1',
      memberId: 'mem_1',
      messageId: 'msg_1',
      status: 'failed',
      threadId: null,
      writerHeld: false,
    } as unknown as ChannelPublicJob,
  ],
  members: [{ agentId: null, id: 'mem_1', name: 'Dario' }],
} as unknown as ChannelDetail;

const mountMessage = (scrollIntoView = vi.fn()) => {
  const target = document.createElement('div');
  target.dataset.channelConversation = 'main';
  const message = document.createElement('div');
  message.dataset.messageId = 'msg_1';
  message.scrollIntoView = scrollIntoView;
  target.append(message);
  document.body.append(target);
  return { remove: () => target.remove(), scrollIntoView };
};

describe('FailureIndicator popover', () => {
  beforeEach(() => useSeenFailureStore.setState({ seen: [] }));

  it('lists each failure as name and reason, without repeating the title’s state', () => {
    render(createElement(FailureIndicator, { detail }));
    expect(screen.getByText('Dario')).toBeTruthy();
    expect(screen.getByText(REASON)).toBeTruthy();
    // The title already says the replies failed: no per-row state, no "Failure reason" label.
    expect(screen.queryByTestId('status')).toBeNull();
    expect(screen.queryByText('receipt.errorReason')).toBeNull();
  });

  it('shows the trigger as an icon alone, with the count only in its label', () => {
    render(createElement(FailureIndicator, { detail }));
    const trigger = screen.getByRole('button', { name: 'failure.title' });
    expect(trigger.textContent).toBe('');
  });

  it('jumps to the failed request from an icon at the row’s end', () => {
    const message = mountMessage();
    render(createElement(FailureIndicator, { detail }));
    fireEvent.click(screen.getByRole('button', { name: 'failure.locate' }));
    expect(message.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    message.remove();
  });

  // Jumping to the failure left the indicator in the header, still nudging about it.
  it('leaves the header once the person jumped to the failure', () => {
    const message = mountMessage();
    render(createElement(FailureIndicator, { detail }));
    fireEvent.click(screen.getByRole('button', { name: 'failure.locate' }));
    expect(screen.queryByRole('button', { name: 'failure.title' })).toBeNull();
    message.remove();
  });

  it('keeps nudging when the failed request is not on the loaded page', () => {
    render(createElement(FailureIndicator, { detail }));
    fireEvent.click(screen.getByRole('button', { name: 'failure.locate' }));
    expect(screen.getByRole('button', { name: 'failure.title' })).toBeTruthy();
  });
});
