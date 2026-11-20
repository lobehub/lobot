import { describe, expect, it } from 'vitest';

import {
  formatUpdatePercent,
  selectUpdateIsland,
  type UpdateIslandInput,
} from './selectUpdateIsland';

const input = (overrides: Partial<UpdateIslandInput> = {}): UpdateIslandInput => ({
  appliedVersion: null,
  installConfirmMode: null,
  updateKind: null,
  updaterStage: null,
  ...overrides,
});

describe('selectUpdateIsland', () => {
  it('stays hidden when nothing is pending', () => {
    expect(selectUpdateIsland(input())).toBeNull();
  });

  it('shows a download until an installable update takes the slot', () => {
    expect(selectUpdateIsland(input({ updaterStage: 'downloading' }))).toBe('downloading');
    expect(
      selectUpdateIsland(
        input({ installConfirmMode: 'unconfirm', updateKind: 'app', updaterStage: 'downloading' }),
      ),
    ).toBe('app-ready');
  });

  it('hides an app update after the user defers it', () => {
    expect(
      selectUpdateIsland(input({ installConfirmMode: 'installLater', updateKind: 'app' })),
    ).toBe('install-later');
    expect(selectUpdateIsland(input({ installConfirmMode: null, updateKind: 'app' }))).toBeNull();
    expect(
      selectUpdateIsland(input({ installConfirmMode: 'installNow', updateKind: 'app' })),
    ).toBeNull();
  });

  it('keeps a ready install ahead of the applied-version notice', () => {
    expect(selectUpdateIsland(input({ appliedVersion: '1.2.3', updateKind: 'renderer' }))).toBe(
      'reload-ready',
    );
    expect(selectUpdateIsland(input({ appliedVersion: '1.2.3', updateKind: 'core-reload' }))).toBe(
      'reload-ready',
    );
    expect(selectUpdateIsland(input({ updateKind: 'core-relaunch' }))).toBe('relaunch-ready');
    expect(selectUpdateIsland(input({ appliedVersion: '1.2.3' }))).toBe('applied');
    expect(
      selectUpdateIsland(input({ appliedVersion: '1.2.3', updaterStage: 'downloading' })),
    ).toBe('downloading');
  });
});

describe('formatUpdatePercent', () => {
  it('rounds into 0–100 and drops values that are not a progress', () => {
    expect(formatUpdatePercent(42.4)).toBe(42);
    expect(formatUpdatePercent(140)).toBe(100);
    expect(formatUpdatePercent(-3)).toBe(0);
    expect(formatUpdatePercent(Number.NaN)).toBeNull();
    expect(formatUpdatePercent(null)).toBeNull();
  });
});
