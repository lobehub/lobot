import { CUSTOM_DOCUMENT_FILE_TYPE, DERIVED_DOCUMENT_SOURCE_TYPE } from '@lobechat/const';

import { lambdaClient } from '@/libs/trpc/client';
import {
  type CheckFileHashResult,
  type FileListItem,
  type QueryFileListParams,
  type QueryFileListSchemaType,
  type UploadFileParams,
} from '@/types/files';

interface CreateFileParams extends Omit<UploadFileParams, 'url'> {
  conversationAgentId?: string;
  knowledgeBaseId?: string;
  parentId?: string;
  url: string;
  visibility?: 'private' | 'public';
}

export class FileService {
  rehostImage = async (url: string) => lambdaClient.file.rehostImage.mutate({ url });

  createFile = async (
    params: UploadFileParams & {
      /** Agent whose conversation this upload is attached to; the server resolves its visibility. */
      conversationAgentId?: string;
      parentId?: string;
      /**
       * Workspace visibility for the new file. `undefined` lets the server
       * apply its default (top-level workspace uploads default to `'private'`,
       * children inherit their parent document). Personal mode ignores this.
       */
      visibility?: 'private' | 'public';
    },
    knowledgeBaseId?: string,
  ): Promise<{ id: string; url: string }> => {
    return lambdaClient.file.createFile.mutate({ ...params, knowledgeBaseId } as CreateFileParams);
  };

  /** Storage URL a canvas can read (no `/f/:id` redirect); see the router for why. */
  getReadableUrl = async (id: string): Promise<string> => {
    const { url } = await lambdaClient.file.getReadableUrl.query({ id });
    return url;
  };

  removeFile = async (id: string): Promise<void> => {
    await lambdaClient.file.removeFile.mutate({ id });
  };

  removeUnreferencedFile = async (id: string): Promise<void> => {
    await lambdaClient.file.removeUnreferencedFile.mutate({ id });
  };

  // V2.0 Migrate from getFiles to getKnowledgeItems
  getKnowledgeItems = async (params: QueryFileListParams) => {
    return lambdaClient.file.getKnowledgeItems.query(params as QueryFileListSchemaType);
  };

  // V2.0 Migrate from getFileItem to getKnowledgeItem
  // This method handles both files (file_ prefix) and documents (docs_ prefix)
  getKnowledgeItem = async (id: string) => {
    // Detect type based on ID prefix
    if (id.startsWith('docs_')) {
      // Document (including folders) - use document endpoint
      const doc = await lambdaClient.document.getDocumentById.query({ id });
      if (!doc) return null;

      const backingFile = doc.fileId
        ? await lambdaClient.file.getFileItemById.query({ id: doc.fileId })
        : undefined;

      // Convert document to FileListItem format
      return {
        chunkCount: null,
        chunkingError: null,
        chunkingStatus: null,
        content: doc.content,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
        editorData: doc.editorData,
        embeddingError: null,
        embeddingStatus: null,
        fileId: doc.fileId,
        fileType: backingFile?.fileType || doc.fileType || CUSTOM_DOCUMENT_FILE_TYPE,
        finishEmbedding: false,
        id: doc.id,
        metadata: doc.metadata,
        name: backingFile?.name || doc.title || doc.filename || 'Untitled',
        parentId: doc.parentId,
        size: backingFile?.size || doc.totalCharCount || 0,
        slug: doc.slug,
        sourceType: DERIVED_DOCUMENT_SOURCE_TYPE,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
        url: backingFile?.url || doc.source || '',
      } as FileListItem;
    } else {
      // File - use dedicated file endpoint
      return lambdaClient.file.getFileItemById.query({ id });
    }
  };

  getFolderBreadcrumb = async (slug: string) => {
    return lambdaClient.document.getFolderBreadcrumb.query({ slug });
  };

  checkFileHash = async (hash: string): Promise<CheckFileHashResult> => {
    return lambdaClient.file.checkFileHash.mutate({ hash });
  };

  /** The Docs home list: pages and files mixed, newest update first. */
  getDocsHomeItems = async (tab: 'mine' | 'recent' | 'shared', limit?: number) => {
    return lambdaClient.file.homeItems.query({ limit, tab });
  };
}

export const fileService = new FileService();
