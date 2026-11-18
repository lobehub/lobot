import type { ChatContextContent } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import { type FilesStoreState } from '@/store/file/initialState';
import { initialState } from '@/store/file/initialState';
import { type UploadFileItem } from '@/types/files/upload';
import { UPLOAD_STATUS_SET } from '@/types/files/upload';

import { fileChatSelectors } from './selectors';

const CONTEXT_KEY = 'main_agent-1_new';

describe('fileChatSelectors', () => {
  describe('chatContextSelections', () => {
    it('returns only the selections owned by the requested conversation', () => {
      const selectionA: ChatContextContent = {
        content: 'selection A',
        id: 'selection-a',
        type: 'text',
      };
      const selectionB: ChatContextContent = {
        content: 'selection B',
        id: 'selection-b',
        type: 'text',
      };
      const state = {
        ...initialState,
        chatContextSelectionsByContext: {
          'topic-a': [selectionA],
          'topic-b': [selectionB],
        },
      } as FilesStoreState;

      expect(fileChatSelectors.chatContextSelections('topic-a')(state)).toEqual([selectionA]);
      expect(fileChatSelectors.chatContextSelections('topic-b')(state)).toEqual([selectionB]);
      expect(fileChatSelectors.chatContextSelections('topic-c')(state)).toEqual([]);
      expect(fileChatSelectors.chatContextSelectionHasItem('topic-a')(state)).toBe(true);
      expect(fileChatSelectors.chatContextSelectionHasItem('topic-c')(state)).toBe(false);
    });

    it('returns the same empty list when no conversation key is available', () => {
      const first = fileChatSelectors.chatContextSelections()(initialState);
      const second = fileChatSelectors.chatContextSelections()(initialState);

      expect(first).toBe(second);
      expect(first).toEqual([]);
    });
  });

  describe('chatUploadFileList', () => {
    it('should return the chatUploadFileList from state', () => {
      const state = {
        chatUploadFileListByContext: { [CONTEXT_KEY]: [{ id: '1' }] as UploadFileItem[] },
      } as FilesStoreState;
      expect(fileChatSelectors.chatUploadFileList(CONTEXT_KEY)(state)).toEqual([{ id: '1' }]);
    });
  });

  describe('chatUploadFileListHasItem', () => {
    it('should return true if chatUploadFileList has items', () => {
      const state = {
        chatUploadFileListByContext: { [CONTEXT_KEY]: [{ id: '1' }] as UploadFileItem[] },
      } as FilesStoreState;
      expect(fileChatSelectors.chatUploadFileListHasItem(CONTEXT_KEY)(state)).toBe(true);
    });

    it('should return false if chatUploadFileList is empty', () => {
      const state = {
        chatUploadFileListByContext: { [CONTEXT_KEY]: [] as UploadFileItem[] },
      } as FilesStoreState;
      expect(fileChatSelectors.chatUploadFileListHasItem(CONTEXT_KEY)(state)).toBe(false);
    });
  });

  describe('isUploadingFiles', () => {
    it('should return true if any file is in uploading status', () => {
      const state = {
        chatUploadFileListByContext: {
          [CONTEXT_KEY]: [
            { status: Array.from(UPLOAD_STATUS_SET)[0] },
            { status: 'completed' },
          ] as UploadFileItem[],
        },
      } as FilesStoreState;
      expect(fileChatSelectors.isUploadingFiles(CONTEXT_KEY)(state)).toBe(true);
    });

    it('should return true if any file has unfinished embedding tasks', () => {
      const state = {
        chatUploadFileListByContext: {
          [CONTEXT_KEY]: [
            { status: 'success', tasks: { finishEmbedding: false } },
            { status: 'success', tasks: { finishEmbedding: true } },
          ] as UploadFileItem[],
        },
      } as FilesStoreState;
      expect(fileChatSelectors.isUploadingFiles(CONTEXT_KEY)(state)).toBe(true);
    });

    it('should return false if no files are uploading or have unfinished tasks', () => {
      const state: FilesStoreState = {
        chatUploadFileListByContext: {
          [CONTEXT_KEY]: [
            { status: 'success', tasks: { finishEmbedding: true } },
            { status: 'success' },
          ] as UploadFileItem[],
        },
      } as FilesStoreState;
      expect(fileChatSelectors.isUploadingFiles(CONTEXT_KEY)(state)).toBe(false);
    });
  });
});
