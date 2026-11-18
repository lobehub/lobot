import { type FileListItem } from '@/types/files';
import { type ResourceItem, type ResourceQueryParams } from '@/types/resource';

import { fileService } from '../file';

/**
 * Map FileListItem to ResourceItem
 */
const mapToResourceItem = (item: FileListItem): ResourceItem => {
  return {
    chunkCount: item.chunkCount,
    chunkTaskId: item.chunkingStatus ? 'placeholder' : null,
    chunkingError: item.chunkingError,
    chunkingStatus: item.chunkingStatus,
    // Document-specific fields
    content: item.content,
    contentPreview: item.contentPreview,

    createdAt: item.createdAt,

    editorData: item.editorData,

    embeddingError: item.embeddingError,

    embeddingStatus: item.embeddingStatus,

    embeddingTaskId: item.embeddingStatus ? 'placeholder' : null,

    fileId: item.fileId,

    fileType: item.fileType,

    finishEmbedding: item.finishEmbedding,

    hasChildren: item.hasChildren,

    id: item.id,

    knowledgeBaseIds: item.knowledgeBaseIds,

    // Metadata
    metadata: item.metadata || undefined,

    name: item.name,

    parentId: item.parentId,

    size: item.size,

    slug: item.slug,

    sourceType: item.sourceType as 'file' | 'document',

    updatedAt: item.updatedAt,

    uploader: item.uploader ?? null,

    // File-specific fields
    url: item.url,

    userId: item.userId,

    visibility: item.visibility,
  };
};

type ResourceStatusItem = Pick<
  ResourceItem,
  | 'chunkCount'
  | 'chunkingError'
  | 'chunkingStatus'
  | 'embeddingError'
  | 'embeddingStatus'
  | 'finishEmbedding'
  | 'id'
>;

/**
 * ResourceService - Unified service for both files and documents
 * Provides a thin wrapper over FileService and DocumentService
 * Used by ResourceManager for optimistic updates
 */
export class ResourceService {
  /**
   * Query resources (unified files + documents)
   * Uses KnowledgeRepo UNION ALL query
   */
  async queryResources(params: ResourceQueryParams): Promise<{
    hasMore: boolean;
    items: ResourceItem[];
    total?: number;
  }> {
    // Map frontend parameter names to backend parameter names
    const backendParams = {
      ...params,
      includeContentPreview: params.includeContentPreview ?? false,
      knowledgeBaseId: params.libraryId, // Map libraryId to knowledgeBaseId
      libraryId: undefined, // Remove the frontend-specific parameter
    };

    const response = await fileService.getKnowledgeItems(backendParams);

    return {
      hasMore: response.hasMore,
      items: response.items.map(mapToResourceItem),
      total: 'total' in response ? (response.total as number) : undefined,
    };
  }
}

export const resourceService = new ResourceService();
