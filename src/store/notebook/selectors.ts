import { type NotebookStore } from './store';

const getDocumentById =
  (topicId: string | undefined, documentId: string | undefined) => (s: NotebookStore) => {
    if (!topicId || !documentId) return null;
    const docs = s.notebookMap[topicId];
    if (!docs) return null;
    return docs.find((d) => d.id === documentId) || null;
  };

const getDocumentsByTopicId = (topicId: string | undefined) => (s: NotebookStore) => {
  if (!topicId) return [];
  return s.notebookMap[topicId] || [];
};

export const notebookSelectors = {
  getDocumentById,
  getDocumentsByTopicId,
};
