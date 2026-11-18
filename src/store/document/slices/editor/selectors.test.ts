import { describe, expect, it } from 'vitest';

import { type DocumentStore } from '../../store';
import { editorSelectors } from './selectors';

const dirtyNotebookInput = () => ({
  content: '',
  editorData: null,
  isDirty: true,
  lastSavedContent: '',
  lastUpdatedTime: null,
  saveStatus: 'idle' as const,
  sourceType: 'notebook' as const,
});

describe('DocumentStore - Editor Selectors', () => {
  const createMockState = (overrides?: Partial<DocumentStore>): DocumentStore =>
    ({
      activeDocumentId: undefined,
      documents: {},
      editor: undefined,
      editorState: undefined,
      ...overrides,
    }) as DocumentStore;

  describe('isDirty', () => {
    it('should return false for non-existent document', () => {
      const state = createMockState();
      expect(editorSelectors.isDirty('non-existent')(state)).toBe(false);
    });

    it('should return isDirty status', () => {
      const state = createMockState({
        documents: {
          'doc-1': dirtyNotebookInput(),
        },
      });
      expect(editorSelectors.isDirty('doc-1')(state)).toBe(true);
    });
  });

  describe('saveStatus', () => {
    it('should return idle for non-existent document', () => {
      const state = createMockState();
      expect(editorSelectors.saveStatus('non-existent')(state)).toBe('idle');
    });

    it('should return save status', () => {
      const state = createMockState({
        documents: {
          'doc-1': {
            content: '',
            editorData: null,
            isDirty: false,
            lastSavedContent: '',
            lastUpdatedTime: null,
            saveStatus: 'saving' as const,
            sourceType: 'notebook' as const,
          },
        },
      });
      expect(editorSelectors.saveStatus('doc-1')(state)).toBe('saving');
    });
  });

  describe('content', () => {
    it('should return empty string for non-existent document', () => {
      const state = createMockState();
      expect(editorSelectors.content('non-existent')(state)).toBe('');
    });

    it('should return content', () => {
      const state = createMockState({
        documents: {
          'doc-1': {
            content: '# Hello',
            editorData: null,
            isDirty: false,
            lastSavedContent: '',
            lastUpdatedTime: null,
            saveStatus: 'idle' as const,
            sourceType: 'notebook' as const,
          },
        },
      });
      expect(editorSelectors.content('doc-1')(state)).toBe('# Hello');
    });
  });
});
