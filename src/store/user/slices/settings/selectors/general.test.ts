import { type UserStore } from '@/store/user';
import { type UserState } from '@/store/user/initialState';
import { initialState } from '@/store/user/initialState';
import { merge } from '@/utils/merge';

import { userGeneralSettingsSelectors } from './general';

describe('settingsSelectors', () => {
  describe('generalConfig', () => {
    it('should return general settings', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: { fontSize: 12 },
        },
      });

      const result = userGeneralSettingsSelectors.config(s as UserStore);

      expect(result).toEqual({
        animationMode: 'agile',
        costEstimateWarningThreshold: 0.5,
        fontSize: 12,
        highlighterTheme: 'lobe-theme',
        isDevMode: false,
        isLiteMode: false,
        mermaidTheme: 'lobe-theme',
        telemetry: true,
        transitionMode: 'fadeIn',
      });
    });
  });

  describe('fontSize', () => {
    it('should return the fontSize', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: { fontSize: 12 },
        },
      });

      const result = userGeneralSettingsSelectors.fontSize(s as UserStore);

      expect(result).toBe(12);
    });
  });

  describe('fontAntialiasing', () => {
    it('should default to true when unset', () => {
      expect(userGeneralSettingsSelectors.fontAntialiasing(initialState as UserStore)).toBe(true);
    });

    it('should return false when turned off', () => {
      const s: UserState = merge(initialState, {
        settings: { general: { fontAntialiasing: false } },
      });

      expect(userGeneralSettingsSelectors.fontAntialiasing(s as UserStore)).toBe(false);
    });
  });

  describe('enablePasteAutoConvert', () => {
    it('should default to true when unset', () => {
      expect(userGeneralSettingsSelectors.enablePasteAutoConvert(initialState as UserStore)).toBe(
        true,
      );
    });

    it('should return false when turned off', () => {
      const s: UserState = merge(initialState, {
        settings: { general: { enablePasteAutoConvert: false } },
      });

      expect(userGeneralSettingsSelectors.enablePasteAutoConvert(s as UserStore)).toBe(false);
    });

    it('should default to false for users who turned off the retired input markdown lab', () => {
      const s: UserState = merge(initialState, {
        preference: { lab: { enableInputMarkdown: false } },
      });

      expect(userGeneralSettingsSelectors.enablePasteAutoConvert(s as UserStore)).toBe(false);
    });

    it('should let the explicit setting win over the retired lab', () => {
      const s: UserState = merge(initialState, {
        preference: { lab: { enableInputMarkdown: false } },
        settings: { general: { enablePasteAutoConvert: true } },
      });

      expect(userGeneralSettingsSelectors.enablePasteAutoConvert(s as UserStore)).toBe(true);
    });
  });

  describe('currentResponseLanguage', () => {
    it('should prefer the saved response language', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: { responseLanguage: 'zh-CN' },
        },
      });

      const result = userGeneralSettingsSelectors.currentResponseLanguage(s as UserStore);

      expect(result).toBe('zh-CN');
    });

    it('should fallback to the normalized browser language', () => {
      const originalLanguage = navigator.language;
      Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'fr' });

      const s: UserState = merge(initialState, {
        settings: {
          general: {},
        },
      });

      const result = userGeneralSettingsSelectors.currentResponseLanguage(s as UserStore);

      expect(result).toBe('fr-FR');

      Object.defineProperty(window.navigator, 'language', {
        configurable: true,
        value: originalLanguage,
      });
    });
  });

  describe('neutralColor', () => {
    it('should return undefined if general settings not exists', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: undefined,
        },
      });

      const result = userGeneralSettingsSelectors.neutralColor(s as UserStore);

      expect(result).toBeUndefined();
    });

    it('should return undefined if neutralColor not set', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: {},
        },
      });

      const result = userGeneralSettingsSelectors.neutralColor(s as UserStore);

      expect(result).toBeUndefined();
    });

    // Lobot has no neutral-color picker, so a value saved from LobeHub must not stick.
    it('ignores a neutralColor saved from LobeHub', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: { neutralColor: '#000000' },
        },
      });

      const result = userGeneralSettingsSelectors.neutralColor(s as UserStore);

      expect(result).toBeUndefined();
    });
  });

  describe('contextMenuMode', () => {
    it('keeps the platform default even when another value was saved', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: { contextMenuMode: 'default' },
        },
      });

      // Tests run outside Electron, where the default is no context menu.
      expect(userGeneralSettingsSelectors.contextMenuMode(s as UserStore)).toBe('disabled');
    });
  });

  describe('primaryColor', () => {
    it('should return undefined if general settings not exists', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: undefined,
        },
      });

      const result = userGeneralSettingsSelectors.primaryColor(s as UserStore);

      expect(result).toBeUndefined();
    });

    it('should return undefined if primaryColor not set', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: {},
        },
      });

      const result = userGeneralSettingsSelectors.primaryColor(s as UserStore);

      expect(result).toBeUndefined();
    });

    it('should return the primaryColor', () => {
      const s: UserState = merge(initialState, {
        settings: {
          general: { primaryColor: '#ffffff' },
        },
      });

      const result = userGeneralSettingsSelectors.primaryColor(s as UserStore);

      expect(result).toBe('#ffffff');
    });
  });
});
