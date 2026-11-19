/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnvironmentFields } from './EnvironmentFields';

const state = vi.hoisted(() => ({ select: undefined as any }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  Button: ({ children }: any) => createElement('button', {}, children),
  Select: (props: any) => {
    state.select = props;
    return createElement('div', { role: 'combobox' });
  },
  Text: ({ children }: any) => createElement('span', {}, children),
}));
vi.mock('@/features/Electron/navigation/webApp', () => ({ webAppUrl: (path: string) => path }));
vi.mock('@/features/WorkingDirectory', () => ({ openPickWorkingDirModal: vi.fn() }));

const device = (deviceId: string, extra: object = {}) => ({
  deviceId,
  hostname: deviceId,
  online: true,
  scope: 'workspace',
  visibility: 'public',
  ...extra,
});

const renderFields = (data: object[], deviceId?: string) =>
  render(
    createElement(EnvironmentFields, {
      controls: {
        change: vi.fn(),
        changeDevice: vi.fn(),
        draft: { agentId: 'agt_1', deviceId, initialized: true },
      } as never,
      devices: { data, isConfirmed: true } as never,
      name: 'Cook',
    }),
  );

describe('EnvironmentFields', () => {
  beforeEach(() => {
    state.select = undefined;
  });

  it('has no empty choice: following the Agent lives outside these fields', () => {
    renderFields([device('mini')]);
    expect(state.select.placeholder).toBe('chooseDevice');
    expect(state.select.value).toBeNull();
    expect(state.select.options).toEqual([{ disabled: false, label: 'mini', value: 'mini' }]);
    expect(screen.queryByText('environment.privateDevicesHint')).toBeNull();
  });

  it('groups private devices, disabled, with one quiet line on where to publish them', () => {
    renderFields([device('mini'), device('imac', { visibility: 'private' })]);
    expect(state.select.options).toEqual([
      { disabled: false, label: 'mini', value: 'mini' },
      {
        label: 'environment.privateGroup',
        options: [{ disabled: true, label: 'imac', value: 'imac' }],
      },
    ]);
    expect(screen.getByText('environment.privateDevicesHint')).toBeTruthy();
    const link = screen.getByText('visibility.private.openSettings') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/settings/devices/imac?visibility=private');
  });

  it('labels the device and, once one is picked, the working directory', () => {
    renderFields([device('mini')], 'mini');
    expect(screen.getByText('profile.device')).toBeTruthy();
    expect(screen.getByText('profile.directory')).toBeTruthy();
  });
});
