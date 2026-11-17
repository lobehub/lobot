import { describe, expect, it } from 'vitest';

import { getNavHeaderLeading, type NavHeaderLeadingInput } from './leading';

const input = (overrides: Partial<NavHeaderLeadingInput>): NavHeaderLeadingInput => ({
  expand: false,
  isMacDesktop: false,
  mobile: false,
  noContent: false,
  showTogglePanelButton: true,
  ...overrides,
});

describe('getNavHeaderLeading', () => {
  describe('desktop', () => {
    it('shows the panel toggle while the left panel is collapsed', () => {
      expect(getNavHeaderLeading(input({}))).toBe('toggle');
    });

    it('drops the toggle while the left panel is open', () => {
      expect(getNavHeaderLeading(input({ expand: true }))).toBe('none');
    });

    it('hides an empty header that only hosted the toggle', () => {
      expect(getNavHeaderLeading(input({ expand: true, noContent: true }))).toBe('hidden');
      expect(getNavHeaderLeading(input({ isMacDesktop: true, noContent: true }))).toBe('hidden');
    });
  });

  describe('compact window', () => {
    it('leads a page back to the list, even with the panel open or nothing else to show', () => {
      expect(getNavHeaderLeading(input({ compact: true, compactBack: true }))).toBe('back');
      expect(getNavHeaderLeading(input({ compact: true, compactBack: true, expand: true }))).toBe(
        'back',
      );
      expect(
        getNavHeaderLeading(
          input({ compact: true, compactBack: true, isMacDesktop: true, noContent: true }),
        ),
      ).toBe('back');
    });

    it('never offers the panel toggle', () => {
      expect(getNavHeaderLeading(input({ compact: true }))).toBe('none');
      expect(getNavHeaderLeading(input({ compact: true, noContent: true }))).toBe('hidden');
    });

    it('adds no back button to panel headers that opt out', () => {
      expect(
        getNavHeaderLeading(
          input({ compact: true, compactBack: true, expand: true, showTogglePanelButton: false }),
        ),
      ).toBe('none');
    });
  });

  describe('mobile', () => {
    it('replaces the panel toggle with the back + drawer pair', () => {
      expect(getNavHeaderLeading(input({ mobile: true }))).toBe('mobile');
      // The desktop panel state is irrelevant: there is no left panel.
      expect(getNavHeaderLeading(input({ expand: true, mobile: true }))).toBe('mobile');
    });

    it('keeps a content-less page header so the page still has a way back', () => {
      expect(getNavHeaderLeading(input({ expand: true, mobile: true, noContent: true }))).toBe(
        'mobile',
      );
    });

    it('leaves panel headers that opt out of the toggle without a back button', () => {
      expect(getNavHeaderLeading(input({ mobile: true, showTogglePanelButton: false }))).toBe(
        'none',
      );
      expect(
        getNavHeaderLeading(input({ mobile: true, noContent: true, showTogglePanelButton: false })),
      ).toBe('hidden');
    });
  });
});
