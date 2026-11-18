import {
  DEFAULT_AGENT,
  DEFAULT_AGENT_CONFIG,
  DEFAULT_HOTKEY_CONFIG,
  DEFAULT_MEMORY_SETTINGS,
} from '@lobechat/const';
import { type HotkeyId, type UserSettings } from '@lobot/types';

import { type UserStore } from '@/store/user';
import { merge } from '@/utils/merge';

export const currentSettings = (s: UserStore): UserSettings => merge(s.defaultSettings, s.settings);

const currentMemorySettings = (s: UserStore) =>
  merge(DEFAULT_MEMORY_SETTINGS, currentSettings(s).memory);

const memoryEnabled = (s: UserStore) => currentMemorySettings(s).enabled !== false;

const defaultAgent = (s: UserStore) => merge(DEFAULT_AGENT, currentSettings(s).defaultAgent);
const defaultAgentConfig = (s: UserStore) => merge(DEFAULT_AGENT_CONFIG, defaultAgent(s).config);

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
