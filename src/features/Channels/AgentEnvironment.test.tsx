/**
 * @vitest-environment happy-dom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openChannelAgentEnvironment } from './AgentEnvironment';

const state = vi.hoisted(() => ({
  close: vi.fn(),
  content: undefined as ReactNode,
  environment: undefined as
    { agentId: string; deviceId?: string; workingDirectory?: string } | undefined,
  update: vi.fn(),
}));

vi.mock('i18next', () => ({ t: (key: string) => key }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  Button: ({ children, disabled, onClick }: any) =>
    createElement('button', { disabled, onClick }, children),
  Flexbox: ({ children }: any) => createElement('div', {}, children),
  RadioGroup: ({ onChange, options, value }: any) =>
    createElement(
      'div',
      { role: 'radiogroup' },
      options.map((option: any) =>
        createElement(
          'div',
          {
            'aria-checked': option.value === value,
            'data-value': option.value,
            'key': option.value,
            'onClick': () => onChange(option.value),
            'role': 'radio',
          },
          option.label,
        ),
      ),
    ),
  Text: ({ children }: any) => createElement('span', {}, children),
  createModal: ({ content }: { content: ReactNode }) => {
    state.content = content;
  },
  toast: { success: vi.fn() },
  useModalContext: () => ({ close: state.close }),
}));
vi.mock('@/components/AsyncBoundary', () => ({ default: ({ children }: any) => children }));
vi.mock('@/components/AsyncError', () => ({ default: () => null }));
vi.mock('@/store/channel', () => ({
  channelActions: {
    updateAgentEnvironment: state.update,
    useFetchAgentEnvironment: () => ({ error: undefined, revalidate: vi.fn() }),
  },
  channelSelectors: { agentEnvironment: () => () => state.environment },
  useChannelStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/device/useDeviceList', () => ({
  useDeviceList: () => ({ data: [], isConfirmed: true }),
}));
vi.mock('./MemberAvatar', () => ({ MemberAvatar: () => null }));
vi.mock('./OwnEnvironmentSummary', () => ({
  OwnEnvironmentSummary: () => createElement('span', {}, 'own-environment'),
}));
// The draft hook's device rules have their own tests; here a device brings its default folder.
vi.mock('./CreateChannel/useChannelAgentDraft', () => ({
  useChannelAgentDraft: (draft: any, _devices: unknown, setDrafts: any) => {
    const change = (patch: any) =>
      setDrafts((current: any[]) =>
        current.map((item) =>
          'deviceId' in patch
            ? {
                ...item,
                deviceId: patch.deviceId,
                workingDirectory: patch.deviceId ? `/home/${patch.deviceId}` : undefined,
              }
            : { ...item, ...patch },
        ),
      );
    return { change, changeDevice: (deviceId?: string) => change({ deviceId }), draft };
  },
}));
vi.mock('./CreateChannel/EnvironmentFields', () => ({
  EnvironmentFields: ({ controls }: any) =>
    createElement(
      'div',
      { 'data-testid': 'fields' },
      createElement(
        'span',
        {},
        `${controls.draft.deviceId ?? ''}|${controls.draft.workingDirectory ?? ''}`,
      ),
      createElement('button', { onClick: () => controls.changeDevice('box') }, 'pick box'),
    ),
  EnvironmentIssue: () => null,
}));

const member = { actorType: 'agent', agentId: 'agt_1', id: 'mem_1', name: 'Cook' } as never;

const open = () => {
  openChannelAgentEnvironment('chn_1', member);
  return render(createElement('div', {}, state.content));
};

const radio = (value: string) =>
  document.querySelector(`[role="radio"][data-value="${value}"]`) as HTMLElement;
const save = () => screen.getByText('save') as HTMLButtonElement;

describe('openChannelAgentEnvironment', () => {
  beforeEach(() => {
    state.close.mockReset();
    state.update.mockReset().mockResolvedValue(undefined);
  });

  it('starts on the Agent’s own settings, shown as a real choice with where it runs', () => {
    state.environment = { agentId: 'agt_1' };
    open();
    expect(radio('agent').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('own-environment')).toBeTruthy();
    expect(screen.queryByTestId('fields')).toBeNull();
    expect(save().disabled).toBe(true);
  });

  it('shows the device fields only after choosing this channel, and saves the pick', async () => {
    state.environment = { agentId: 'agt_1' };
    open();
    fireEvent.click(radio('channel'));
    expect(screen.getByTestId('fields')).toBeTruthy();
    // Nothing picked yet: there is nothing to save.
    expect(save().disabled).toBe(true);

    fireEvent.click(screen.getByText('pick box'));
    expect(save().disabled).toBe(false);
    await act(async () => fireEvent.click(save()));
    expect(state.update).toHaveBeenCalledWith('chn_1', 'mem_1', {
      deviceId: 'box',
      workingDirectory: '/home/box',
    });
  });

  it('clears a channel pick when switching back to the Agent’s settings', async () => {
    state.environment = { agentId: 'agt_1', deviceId: 'mac', workingDirectory: '/repo' };
    open();
    expect(radio('channel').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('mac|/repo')).toBeTruthy();

    fireEvent.click(radio('agent'));
    expect(screen.queryByTestId('fields')).toBeNull();
    await act(async () => fireEvent.click(save()));
    expect(state.update).toHaveBeenCalledWith('chn_1', 'mem_1', {
      deviceId: undefined,
      workingDirectory: undefined,
    });
  });

  it('restores the earlier pick, folder included, when switching back to this channel', () => {
    state.environment = { agentId: 'agt_1', deviceId: 'mac', workingDirectory: '/repo' };
    open();
    fireEvent.click(radio('agent'));
    fireEvent.click(radio('channel'));
    expect(screen.getByText('mac|/repo')).toBeTruthy();
    expect(save().disabled).toBe(true);
  });
});
