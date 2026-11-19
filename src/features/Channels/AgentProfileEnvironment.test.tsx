/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentProfileEnvironment } from './AgentProfileEnvironment';

dayjs.extend(relativeTime);

const state = vi.hoisted(() => ({
  binding: undefined as { deviceId: string | null } | undefined,
  channelEnvironment: undefined as { deviceId?: string; workingDirectory?: string } | undefined,
  fetchEnvironment: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ title }: { title?: string }) => createElement('button', { title }),
  CopyButton: () => null,
  Flexbox: ({ children }: { children?: unknown }) => createElement('div', {}, children as never),
  Tag: ({ children, ...props }: { children?: unknown }) =>
    createElement('span', props, children as never),
  Text: ({ children }: { children?: unknown }) => createElement('span', {}, children as never),
}));
vi.mock('@lobehub/ui/dashboard', () => ({
  Surface: ({ children, padded: _padded, ...props }: { children?: unknown; padded?: boolean }) =>
    createElement('div', props, children as never),
}));
vi.mock('@lobechat/const', () => ({ isDesktop: true }));
vi.mock('@/features/DeviceManager/getDeviceIcon', () => ({ getDeviceIcon: () => null }));
vi.mock('@/helpers/executionTarget', () => ({ resolveExecutionTarget: () => 'sandbox' }));
vi.mock('@/helpers/gatewayMode', () => ({ useIsGatewayModeEnabled: () => true }));
vi.mock('@/hooks/useEffectiveAgencyConfig', () => ({
  useEffectiveAgencyConfig: () => ({
    agencyConfig: { workingDirByDevice: { box: '/srv/app' } },
    workspaceScoped: false,
  }),
}));
vi.mock('@/store/agent', () => ({ useAgentStore: () => false }));
vi.mock('@/store/agent/selectors', () => ({
  agentByIdSelectors: { isAgentHeterogeneousById: () => () => false },
}));
vi.mock('@/store/channel', () => ({
  channelActions: { useFetchAgentEnvironment: state.fetchEnvironment },
  channelSelectors: { agentEnvironment: () => () => state.channelEnvironment },
  useChannelStore: (selector: (s: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/device', () => ({
  deviceSelectors: { agentDeviceBinding: () => () => state.binding },
  useDeviceStore: (selector: (s: unknown) => unknown) =>
    selector({ useFetchAgentDeviceBinding: () => ({}) }),
}));
vi.mock('@/store/device/useDeviceList', () => ({
  useDeviceList: () => ({
    data: [
      { defaultCwd: '/home/me', deviceId: 'mac', hostname: 'MacBook', online: false },
      { defaultCwd: '/root', deviceId: 'box', hostname: 'dev-box', online: true },
    ],
    isConfirmed: true,
  }),
}));
vi.mock('./AgentEnvironment', () => ({ openChannelAgentEnvironment: () => {} }));
vi.mock('./CreateChannel/EnvironmentFields', () => ({
  deviceLabel: (device: { hostname: string }) => device.hostname,
}));

const member = { id: 'mem_1', name: 'Justin' } as never;

const renderPanel = (manageable?: boolean) =>
  render(
    createElement(AgentProfileEnvironment, {
      agentId: 'agt_1',
      channelId: 'chn_1',
      manageable,
      member,
    }),
  );

describe('AgentProfileEnvironment', () => {
  beforeEach(() => {
    state.binding = undefined;
    state.channelEnvironment = undefined;
    state.fetchEnvironment.mockClear();
  });

  it('shows the device the Agent runs on, whether it is connected, and its directory', () => {
    state.binding = { deviceId: 'box' };
    renderPanel();
    const card = screen.getByRole('group', { name: 'environment.title' });
    expect(card).toContainElement(screen.getByText('dev-box'));
    expect(card).toContainElement(screen.getByText('blockedDevice.connected'));
    expect(card).not.toContainElement(screen.getByText('environment.title'));
    expect(screen.getByText('blockedDevice.connected')).toBeTruthy();
    expect(screen.getByText('/srv/app')).toBeTruthy();
    // Only an admin may read the Channel's own pick.
    expect(state.fetchEnvironment).not.toHaveBeenCalled();
  });

  it('shows an admin the device and directory picked for this conversation', () => {
    state.binding = { deviceId: 'box' };
    state.channelEnvironment = { deviceId: 'mac', workingDirectory: '/repo/lobot' };
    renderPanel(true);
    expect(screen.getByText('MacBook')).toBeTruthy();
    expect(screen.getByText('blockedDevice.offline')).toBeTruthy();
    expect(screen.queryByText('dev-box')).toBeNull();
    expect(screen.getByText('/repo/lobot')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'environment.title' })).toContainElement(
      screen.getByTitle('environment.editNamed'),
    );
  });

  it('says where an Agent without a device runs, with no directory', () => {
    state.binding = { deviceId: null };
    renderPanel();
    expect(screen.getByText('heteroAgent.executionTarget.sandbox')).toBeTruthy();
    expect(screen.queryByText('profile.directory')).toBeNull();
  });

  it('does not guess while the device binding is loading', () => {
    renderPanel();
    expect(screen.getByText('environment.checkingDevice')).toBeTruthy();
  });
});
