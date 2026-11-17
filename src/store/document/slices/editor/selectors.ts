import { type DocumentStore } from '../../store';
import { type EditorContentState } from './initialState';

const isDirty = (id: string) => (s: DocumentStore) => s.documents[id]?.isDirty ?? false;

const saveStatus = (id: string) => (s: DocumentStore) => s.documents[id]?.saveStatus ?? 'idle';

const charLimitError = (id: string) => (s: DocumentStore) => s.documents[id]?.charLimitError;

const content = (id: string) => (s: DocumentStore) => s.documents[id]?.content ?? '';

const lastUpdatedTime = (id: string) => (s: DocumentStore) =>
  s.documents[id]?.lastUpdatedTime?.toISOString();

/**
 * Check if a document is still loading (not yet in the store)
 */
const isDocumentLoading = (id: string | undefined) => (s: DocumentStore) => !id || !s.documents[id];

export const editorSelectors = {
  // By ID
  content,
  isDocumentLoading,
  isDirty,
  lastUpdatedTime,
  charLimitError,
  saveStatus,
};
