import { describe, expect, it } from 'vitest';

import { taskListSelectors } from './listSelectors';

describe('taskListSelectors', () => {
  describe('getDisplayStatus', () => {
    it('should map backend statuses to UI labels', () => {
      expect(taskListSelectors.getDisplayStatus('backlog')).toBe('Backlog');
      expect(taskListSelectors.getDisplayStatus('running')).toBe('In progress');
      expect(taskListSelectors.getDisplayStatus('paused')).toBe('Needs input');
      expect(taskListSelectors.getDisplayStatus('failed')).toBe('Needs input');
      expect(taskListSelectors.getDisplayStatus('completed')).toBe('Done');
      expect(taskListSelectors.getDisplayStatus('canceled')).toBe('Canceled');
    });

    it('should return raw status for unknown values', () => {
      expect(taskListSelectors.getDisplayStatus('unknown')).toBe('unknown');
    });
  });
});
