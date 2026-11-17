import { useCallback } from 'react';

import { usePermission } from '@/hooks/usePermission';
import { useFileStore } from '@/store/file';

interface UseUploadFilesOptions {
  /** The conversation's agent id. Decides whether the chat-only file-type whitelist applies. */
  agentId: string;
  /**
   * The composer the files land in (its `contextSelectionKey`). Without one
   * there is no attachment list to show them, so nothing is uploaded.
   */
  contextKey?: string;
}

/**
 * Uploads files into a composer's attachments. External Agents read any file through their own
 * tools, so no media type is held back.
 */
export const useUploadFiles = ({ agentId, contextKey }: UseUploadFilesOptions) => {
  const uploadFiles = useFileStore((s) => s.uploadChatFiles);
  const { allowed: canUpload } = usePermission('create_content');

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (!canUpload || !contextKey || files.length === 0) return;
      uploadFiles(contextKey, files, agentId);
    },
    [agentId, canUpload, contextKey, uploadFiles],
  );

  return { handleUploadFiles };
};
