import { describe, expect, it } from 'vitest';

import { type UserStore } from '@/store/user';

import { initialPreferenceState } from './initialState';
import { labPreferSelectors, preferenceSelectors } from './selectors';

describe('preferenceSelectors', () => {
  let store: UserStore;

  beforeEach(() => {
    store = {
      ...initialPreferenceState,
    } as unknown as UserStore;
  });

  describe('useCmdEnterToSend', () => {
    it('should return the value of useCmdEnterToSend preference', () => {
      store.preference.useCmdEnterToSend = true;
      expect(preferenceSelectors.useCmdEnterToSend(store)).toBe(true);

      store.preference.useCmdEnterToSend = false;
      expect(preferenceSelectors.useCmdEnterToSend(store)).toBe(false);
    });

    it('should return false if useCmdEnterToSend preference is undefined', () => {
      store.preference.useCmdEnterToSend = undefined;
      expect(preferenceSelectors.useCmdEnterToSend(store)).toBe(false);
    });
  });

  describe('terminalFontFamily', () => {
    it('returns the configured font family without surrounding whitespace', () => {
      store.preference.terminalFontFamily = '  JetBrains Mono  ';

      expect(preferenceSelectors.terminalFontFamily(store)).toBe('JetBrains Mono');
    });

    it('falls back when the configured font family is empty', () => {
      store.preference.terminalFontFamily = '   ';

      expect(preferenceSelectors.terminalFontFamily(store)).toBeUndefined();
    });
  });

  describe('labPreferSelectors', () => {
    it('should default project workspaces to disabled and honor the lab preference', () => {
      store.preference.lab = undefined;
      expect(labPreferSelectors.enableProjects(store)).toBe(false);

      store.preference.lab = { enableProjects: true };
      expect(labPreferSelectors.enableProjects(store)).toBe(true);
    });

    it('returns false for message text selection actions by default', () => {
      store.preference.lab = undefined;

      expect(labPreferSelectors.enableMessageTextSelectionActions(store)).toBe(false);
    });

    it('returns the configured message text selection actions preference', () => {
      store.preference.lab = { enableMessageTextSelectionActions: true };

      expect(labPreferSelectors.enableMessageTextSelectionActions(store)).toBe(true);
    });
  });
});
