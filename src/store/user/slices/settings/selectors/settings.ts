import {
  DEFAULT_AGENT,
  DEFAULT_AGENT_CONFIG,
  DEFAULT_HOTKEY_CONFIG,
  DEFAULT_MEMORY_SETTINGS,
} from '@lobechat/const';
import { type HotkeyId, type UserSettings } from '@lobot/types';

import { type UserStore } from '@/store/user';
import { merge } from '@/utils/merge';

/**
 * Caches the last merge by its inputs' identity. Settings change rarely but are read on every
 * render of hot rows (gateway mode, execution target), and a deep merge per read was a visible
 * share of opening a Channel; it also keeps the result stable for selectors that compare it.
 */
const mergeLast = <T, S>(merger: (target: T, source: S) => T) => {
  let last: { result: T; source: S; target: T } | undefined;
  return (target: T, source: S): T => {
    if (!last || last.target !== target || last.source !== source)
      last = { result: merger(target, source), source, target };
    return last.result;
  };
};

const mergeSettings = mergeLast<UserSettings, UserStore['settings']>((target, source) =>
  merge(target, source),
);
const mergeDefaultAgent = mergeLast<typeof DEFAULT_AGENT, UserSettings['defaultAgent']>(
  (target, source) => merge(target, source),
);
const mergeDefaultAgentConfig = mergeLast<
  typeof DEFAULT_AGENT_CONFIG,
  (typeof DEFAULT_AGENT)['config']
>((target, source) => merge(target, source));

export const currentSettings = (s: UserStore): UserSettings =>
  mergeSettings(s.defaultSettings, s.settings);

const currentMemorySettings = (s: UserStore) =>
  merge(DEFAULT_MEMORY_SETTINGS, currentSettings(s).memory);

const memoryEnabled = (s: UserStore) => currentMemorySettings(s).enabled !== false;

const defaultAgent = (s: UserStore) =>
  mergeDefaultAgent(DEFAULT_AGENT, currentSettings(s).defaultAgent);
const defaultAgentConfig = (s: UserStore) =>
  mergeDefaultAgentConfig(DEFAULT_AGENT_CONFIG, defaultAgent(s).config);

const exportSettings = currentSettings;

const getHotkeyById = (id: HotkeyId) => (s: UserStore) =>
  merge(DEFAULT_HOTKEY_CONFIG, currentSettings(s).hotkey)[id];

export const settingsSelectors = {
  currentMemorySettings,
  currentSettings,
  defaultAgent,
  defaultAgentConfig,
  exportSettings,
  getHotkeyById,
  memoryEnabled,
};
