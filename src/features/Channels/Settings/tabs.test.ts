import { describe, expect, it } from 'vitest';

import { channelSettingsTabs, resolveChannelSettingsTab } from './tabs';

describe('channelSettingsTabs', () => {
  it('drops replies for an archived Channel', () => {
    expect(channelSettingsTabs(false)).toEqual(['general', 'members', 'reply', 'advanced']);
    expect(channelSettingsTabs(true)).toEqual(['general', 'members', 'advanced']);
  });

  it('shows the project of a project Channel', () => {
    expect(channelSettingsTabs(false, true)).toEqual([
      'general',
      'project',
      'members',
      'reply',
      'advanced',
    ]);
  });
});

describe('resolveChannelSettingsTab', () => {
  it('opens the requested tab', () => {
    expect(resolveChannelSettingsTab('reply', channelSettingsTabs(false))).toBe('reply');
  });

  it.each([null, 'unknown'])('falls back to general for %s', (requested) => {
    expect(resolveChannelSettingsTab(requested, channelSettingsTabs(false))).toBe('general');
  });

  it('falls back when the requested tab is unavailable', () => {
    expect(resolveChannelSettingsTab('reply', channelSettingsTabs(true))).toBe('general');
    expect(resolveChannelSettingsTab('project', channelSettingsTabs(false))).toBe('general');
  });
});
