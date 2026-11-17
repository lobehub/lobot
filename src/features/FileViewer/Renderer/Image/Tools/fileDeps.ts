import { lambdaClient } from '@/libs/trpc/client';
import { fileService } from '@/services/file';
import { knowledgeBaseService } from '@/services/knowledgeBase';
import { useFileStore } from '@/store/file';

import { loadReadableImage } from './exportImage';
import type { SaveDerivedFileDeps } from './saveDerivedFile';

/** Where a saved edit goes: the original's folder and libraries, through the file services. */
export const fileDeps: SaveDerivedFileDeps = {
  addToKnowledgeBase: (knowledgeBaseId, fileIds) =>
    knowledgeBaseService.addFilesToKnowledgeBase(knowledgeBaseId, fileIds),
  getFile: async (id) => {
    const file = await lambdaClient.file.findById.query({ id });
    return {
      knowledgeBaseIds: file.knowledgeBaseIds,
      metadata: file.metadata as Record<string, unknown> | null,
      parentId: file.parentId,
      size: file.size,
      visibility: file.visibility,
    };
  },
  uploadFile: async ({ file, metadata, parentId, visibility }) => {
    const result = await useFileStore.getState().uploadWithProgress({
      file,
      fileMetadata: metadata,
      parentId,
      visibility,
    });
    return result && { id: result.id, url: result.url };
  },
};

/** Load the image on stage for canvas export, reading `/f/:id` files from storage directly. */
export const loadStageImage = (url: string) =>
  loadReadableImage(url, { resolveProxyUrl: (id) => fileService.getReadableUrl(id) });
