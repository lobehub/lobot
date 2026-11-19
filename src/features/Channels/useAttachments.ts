import { COMPRESSIBLE_IMAGE_TYPES, compressImageFile } from '@lobechat/utils/compressImage';
import { toast } from '@lobehub/ui';
import { CHANNEL_LIMITS, type UploadFileItem } from '@lobot/types';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { FILE_UPLOAD_BLACKLIST } from '@/const/file';
import { useFileStore } from '@/store/file';

export type DraftFile = UploadFileItem & { fileId?: string };

/** An image is shown from the local file while it uploads; the URL lives as long as the draft. */
const localPreview = (file: File) =>
  file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
const releasePreview = (item: DraftFile) => {
  if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
};

interface AttachmentDraft {
  items: DraftFile[];
  listeners: Set<() => void>;
  mounts: number;
  /** The uploaded files last written to storage, so progress ticks never touch it. */
  stored: string;
}

/** An uploaded attachment as kept across reloads; the local file itself is gone by then. */
interface StoredAttachment {
  fileId: string;
  fileUrl: string;
  id: string;
  name: string;
  size: number;
  type: string;
}

export const ATTACHMENT_DRAFTS_STORAGE_KEY = 'lobot:channel-attachment-drafts:v1';

/** Conversations whose unsent attachments stay in memory; the least recently used go first. */
const MAX_DRAFTS = 20;
/** The same bound as the text drafts these sit next to. */
const MAX_STORED_DRAFTS = 50;

const readStored = (): Record<string, StoredAttachment[]> => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ATTACHMENT_DRAFTS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/** Keeps a draft's uploaded files next to its text draft, so a reload brings both back. */
const writeStored = (key: string, draft: AttachmentDraft) => {
  if (typeof window === 'undefined') return;
  const uploaded = draft.items.flatMap((item): StoredAttachment[] =>
    item.status === 'success' && item.fileId && item.fileUrl
      ? [
          {
            fileId: item.fileId,
            fileUrl: item.fileUrl,
            id: item.id,
            name: item.file.name,
            size: item.file.size,
            type: item.file.type,
          },
        ]
      : [],
  );
  const next = JSON.stringify(uploaded);
  if (next === draft.stored) return;
  draft.stored = next;
  const stored = readStored();
  // Re-added last, so key order is recency order and the cap drops the oldest drafts.
  delete stored[key];
  if (uploaded.length) stored[key] = uploaded;
  const keys = Object.keys(stored);
  for (const stale of keys.slice(0, Math.max(0, keys.length - MAX_STORED_DRAFTS)))
    delete stored[stale];
  try {
    window.localStorage.setItem(ATTACHMENT_DRAFTS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage full or unavailable: the attachments still live in memory for this session.
  }
};

/** A placeholder for a restored upload: only its name, type and size are ever read. */
const restoredFile = ({ name, size, type }: StoredAttachment) => {
  const file = new File([], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const restore = (key: string): AttachmentDraft => {
  const stored = readStored()[key] ?? [];
  return {
    items: stored.map((item) => ({
      file: restoredFile(item),
      fileId: item.fileId,
      fileUrl: item.fileUrl,
      id: item.id,
      status: 'success',
    })),
    listeners: new Set(),
    mounts: 0,
    stored: JSON.stringify(stored),
  };
};

const release = (draft: AttachmentDraft) => {
  for (const item of draft.items) {
    item.abortController?.abort();
    releasePreview(item);
  }
};

/**
 * Attachments belong to the conversation a composer writes to, not to one mounted composer: they
 * survive switching to another Thread and back, and keep uploading meanwhile. Uploaded ones are
 * also stored, so a reload restores them with the text draft.
 */
const drafts = new Map<string, AttachmentDraft>();

const draftFor = (key: string) => {
  let draft = drafts.get(key);
  if (draft) {
    // Map order is recency order: touching a draft moves it to the end.
    drafts.delete(key);
    drafts.set(key, draft);
    return draft;
  }
  draft = restore(key);
  drafts.set(key, draft);
  for (const [staleKey, stale] of drafts) {
    if (drafts.size <= MAX_DRAFTS) break;
    // An evicted draft's uploaded files are still stored; only unfinished uploads are lost.
    if (stale.mounts > 0) continue;
    drafts.delete(staleKey);
    release(stale);
    // Should its composer still mount, it starts from what was stored, not the aborted uploads.
    stale.items = restore(staleKey).items;
  }
  return draft;
};

/** Each Channel/Thread composer owns its uploads; ordinary chat's global draft is untouched. */
export function useAttachments(draftKey: string) {
  const { t } = useTranslation('channel');
  const upload = useFileStore((s) => s.uploadWithProgress);
  const draft = draftFor(draftKey);
  const subscribe = useCallback(
    (listener: () => void) => {
      draft.listeners.add(listener);
      return () => draft.listeners.delete(listener);
    },
    [draft],
  );
  const items = useSyncExternalStore(subscribe, () => draft.items);
  const update = (next: DraftFile[]) => {
    draft.items = next;
    writeStored(draftKey, draft);
    for (const listener of draft.listeners) listener();
  };
  const patch = (id: string, value: Partial<DraftFile>) =>
    update(draft.items.map((item) => (item.id === id ? { ...item, ...value, id } : item)));

  useEffect(() => {
    // An evicted draft that is shown again comes back from storage.
    if (drafts.get(draftKey) !== draft) drafts.set(draftKey, draft);
    draft.mounts += 1;
    return () => {
      draft.mounts -= 1;
    };
  }, [draft, draftKey]);

  const run = async (item: DraftFile) => {
    const abortController = new AbortController();
    patch(item.id, { abortController, error: undefined, errorCode: undefined, status: 'pending' });
    try {
      const file = COMPRESSIBLE_IMAGE_TYPES.has(item.file.type)
        ? await compressImageFile(item.file)
        : item.file;
      if (abortController.signal.aborted) return;
      const result = await upload({
        file,
        abortController,
        uploadId: item.id,
        onStatusUpdate: (event) => {
          if (abortController.signal.aborted) return;
          if (event.type === 'updateFile') patch(item.id, event.value);
        },
      });
      if (abortController.signal.aborted) return;
      if (!result) {
        patch(item.id, { status: 'error', error: t('attachments.failed') });
        return;
      }
      patch(item.id, { fileId: result.id, fileUrl: result.url, status: 'success' });
    } catch (cause) {
      console.error('Failed to upload Channel attachment', cause);
      if (!abortController.signal.aborted)
        patch(item.id, { status: 'error', error: t('attachments.failed') });
    }
  };

  return {
    items,
    blocked: items.some((item) => item.status !== 'success'),
    // Read synchronously so Enter cannot race a just-started upload before React renders.
    readyFileIds: () =>
      draft.items.every((item) => item.status === 'success' && item.fileId)
        ? draft.items.map((item) => item.fileId!)
        : undefined,
    upload: async (files: File[]) => {
      const accepted = files.filter((file) => !FILE_UPLOAD_BLACKLIST.includes(file.name));
      if (draft.items.length + accepted.length > CHANNEL_LIMITS.attachments) {
        toast.error(t('attachments.limit', { count: CHANNEL_LIMITS.attachments }));
        return;
      }
      const added = accepted.map((file): DraftFile => ({
        file,
        id: crypto.randomUUID(),
        previewUrl: localPreview(file),
        status: 'pending',
      }));
      update([...draft.items, ...added]);
      await Promise.all(added.map(run));
    },
    remove: (id: string) => {
      const removed = draft.items.find((item) => item.id === id);
      removed?.abortController?.abort();
      if (removed) releasePreview(removed);
      update(draft.items.filter((item) => item.id !== id));
    },
    retry: (id: string) => {
      const item = draft.items.find((item) => item.id === id);
      if (item?.status === 'error') void run(item);
    },
    // A sent draft's images are shown from their uploaded URLs; the local copies can go.
    clear: () => {
      for (const item of draft.items) releasePreview(item);
      update([]);
    },
  };
}
