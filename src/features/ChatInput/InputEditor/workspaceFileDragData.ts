import { WORKSPACE_FILE_DRAG_MIME } from '@lobechat/const';

/**
 * Payload serialized into the drag `dataTransfer` when a file/folder row is
 * dragged out of the working sidebar tree. Mirrors the `localFile` mention
 * metadata so the drop handler can dispatch `INSERT_MENTION_COMMAND` directly.
 */
interface WorkspaceFileDragPayload {
  isDirectory: boolean;
  /** Display name (basename) shown on the mention chip. */
  name: string;
  /** Absolute path on the working device's filesystem. */
  path: string;
}

/**
 * Write only our custom MIME — no `text/plain` fallback. The Lexical chat input
 * reacts to `text/plain` drops and would race with the drop handler. Mark the
 * drag as `copy` so the input can accept it even though the source tree is not a
 * reorder target (the working files panel has no `onMove`).
 */
export const writeWorkspaceFileDragData = (
  dataTransfer: DataTransfer,
  payload: WorkspaceFileDragPayload,
): void => {
  dataTransfer.setData(WORKSPACE_FILE_DRAG_MIME, JSON.stringify(payload));
  dataTransfer.effectAllowed = 'copy';
};

export const readWorkspaceFileDragData = (
  dataTransfer: DataTransfer,
): WorkspaceFileDragPayload | undefined => {
  const raw = dataTransfer.getData(WORKSPACE_FILE_DRAG_MIME);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceFileDragPayload>;
    if (!parsed || typeof parsed.path !== 'string' || parsed.path.length === 0) {
      return undefined;
    }
    return {
      isDirectory: !!parsed.isDirectory,
      name: typeof parsed.name === 'string' && parsed.name ? parsed.name : parsed.path,
      path: parsed.path,
    };
  } catch {
    return undefined;
  }
};

// Inline lucide `File` / `Folder` glyphs so the preview never depends on cloning
// the pierre/trees row icon out of its shadow DOM.
