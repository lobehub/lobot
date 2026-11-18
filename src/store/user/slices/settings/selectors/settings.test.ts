import { type HotkeyId } from '@/types/hotkey';

import { type UserStore } from '../../../store';
import { settingsSelectors } from './settings';

describe('settingsSelectors', () => {
  describe('currentSettings', () => {
    it('should merge DEFAULT_SETTINGS and s.settings correctly', () => {
      const s = {
        settings: {
          avatar: 'avatar.jpg',
          fontSize: 14,
          language: 'en-US',
          neutralColor: 'sand',
          password: 'password123',
          primaryColor: 'blue',
          themeMode: 'light',
          defaultAgent: {
            config: {
              systemRole: '',
              model: 'gpt-3.5-turbo',
              params: {},
              tts: {
                showAllLocaleVoice: false,
                ttsService: 'openai',
                voice: {
                  openai: 'alloy',
                },
              },
            },
            meta: {
              avatar: 'Default Agent',
              description: 'Default agent for testing',
            },
          },
          tts: {
            openAI: {
              ttsModel: 'tts-1',
            },
          },
          languageModel: {
            openAI: {
              OPENAI_API_KEY: 'openai-api-key',
              endpoint: 'https://openai-endpoint.com',
              models: ['gpt-3.5-turbo'],
            },
          },
        },
      } as unknown as UserStore;

      const result = settingsSelectors.currentSettings(s);

      expect(result).toMatchSnapshot();
    });
  });

  describe('defaultAgent', () => {
    it('should merge DEFAULT_AGENT and s.settings.defaultAgent correctly', () => {
      const s = {
        settings: {
          defaultAgent: {
            config: {
              systemRole: 'user',
              model: 'gpt-3.5-turbo',
            },
            meta: {
              avatar: 'agent-avatar.jpg',
              description: 'Test agent',
            },
          },
        },
      } as unknown as UserStore;

      const result = settingsSelectors.defaultAgent(s);

      expect(result).toMatchSnapshot();
    });
  });

  describe('defaultAgentConfig', () => {
    it('should merge DEFAULT_AGENT_CONFIG and defaultAgent(s).config correctly', () => {
      const s = {
        settings: {
          defaultAgent: {
            config: {
              systemRole: 'custom role',
              model: 'gpt-4',
              params: {
                temperature: 0.7,
              },
            },
          },
        },
      } as unknown as UserStore;

      const result = settingsSelectors.defaultAgentConfig(s);

      expect(result).toMatchSnapshot();
    });
  });

  describe('exportSettings', () => {
    it('should return the current settings', () => {
      const s = {
        defaultSettings: {
          fontSize: 16,
        },
        settings: {
          fontSize: 14,
          language: 'en-US',
        },
      } as unknown as UserStore;

      const result = settingsSelectors.exportSettings(s);

      expect(result).toEqual({
        fontSize: 14,
        language: 'en-US',
      });
    });
  });

  describe('getHotkeyById', () => {
    it('should return the hotkey config for a given id', () => {
      const hotkeyConfig = {
        hotkey: 'ctrl+shift+f',
        scope: 'global',
      };

      const s = {
        settings: {
          hotkey: {
            newChat: hotkeyConfig,
          },
        },
      } as unknown as UserStore;

      const result = settingsSelectors.getHotkeyById('newChat' as HotkeyId)(s);

      expect(result).toMatchSnapshot();
    });

    it('should return default hotkey if not defined in settings', () => {
      const s = {
        settings: {
          hotkey: {},
        },
      } as unknown as UserStore;

      const result = settingsSelectors.getHotkeyById('newChat' as HotkeyId)(s);

      expect(result).toMatchSnapshot();
    });
  });
});
