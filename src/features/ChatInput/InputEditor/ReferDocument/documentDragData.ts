import { AGENT_DOCUMENT_DRAG_MIME } from '@lobechat/const';

/** Payload carried when an agent document row is dragged into the chat input. */
interface DocumentDragPayload {
  /** Agent-document binding id (`agent_documents.id`), as read by `readDocument`. */
  documentId: string;
  title: string;
}

/**
 * Write only our custom MIME — no `text/plain` fallback, which the Lexical chat
 * input would race to insert as text.
 */
export const writeDocumentDragData = (
  dataTransfer: DataTransfer,
  payload: DocumentDragPayload,
): void => {
  dataTransfer.setData(AGENT_DOCUMENT_DRAG_MIME, JSON.stringify(payload));
};

export const readDocumentDragData = (
  dataTransfer: DataTransfer,
): DocumentDragPayload | undefined => {
  const raw = dataTransfer.getData(AGENT_DOCUMENT_DRAG_MIME);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<DocumentDragPayload>;
    if (typeof parsed.documentId !== 'string' || parsed.documentId.length === 0) return undefined;

    return {
      documentId: parsed.documentId,
      title:
        typeof parsed.title === 'string' && parsed.title.length > 0 ? parsed.title : 'Untitled',
    };
  } catch {
    return undefined;
  }
};
