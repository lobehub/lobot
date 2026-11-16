import { beforeEach, describe, expect, it } from 'vitest';

import { useWorkspaceStore } from '@/business/client/workspace/store';
import { useElectronStore } from '@/store/electron';

import { deviceSettingsUrl, isPrivateWorkspaceDevice } from './deviceVisibility';

describe('isPrivateWorkspaceDevice', () => {
  it('is only a workspace enrollment kept private', () => {
    expect(isPrivateWorkspaceDevice({ scope: 'workspace', visibility: 'private' })).toBe(true);
    expect(isPrivateWorkspaceDevice({ scope: 'workspace', visibility: 'public' })).toBe(false);
    // Personal devices have no visibility dimension; unregistered ghosts carry none yet.
    expect(isPrivateWorkspaceDevice({ scope: 'personal', visibility: null })).toBe(false);
    expect(isPrivateWorkspaceDevice({ scope: 'workspace', visibility: null })).toBe(false);
  });
});

describe('deviceSettingsUrl', () => {
  beforeEach(() => {
    useElectronStore.setState({ dataSyncConfig: { active: true, storageMode: 'cloud' } });
    useWorkspaceStore.setState({
      activeWorkspaceId: 'ws_1',
      workspaces: [{ id: 'ws_1', name: 'Acme', slug: 'acme' }] as never,
    });
  });

  // The jump must land on that device in the active workspace, not on the settings home.
  it("opens a private device's own page in the workspace's private pool", () => {
    expect(
      deviceSettingsUrl({ deviceId: 'dev/1', scope: 'workspace', visibility: 'private' }),
    ).toBe('https://app.lobehub.com/acme/settings/devices/dev%2F1?visibility=private');
  });

  it('opens a shared device on the workspace pool', () => {
    expect(deviceSettingsUrl({ deviceId: 'dev_1', scope: 'workspace', visibility: 'public' })).toBe(
      'https://app.lobehub.com/acme/settings/devices/dev_1',
    );
  });

  it('uses the self-hosted server the desktop signed in to', () => {
    useElectronStore.setState({
      dataSyncConfig: {
        active: true,
        remoteServerUrl: 'https://lobe.example.com',
        storageMode: 'selfHost',
      },
    });

    expect(
      deviceSettingsUrl({ deviceId: 'dev_1', scope: 'workspace', visibility: 'private' }),
    ).toBe('https://lobe.example.com/acme/settings/devices/dev_1?visibility=private');
  });
});
