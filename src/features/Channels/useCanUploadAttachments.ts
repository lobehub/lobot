import { usePermission } from '@/hooks/usePermission';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';

/** Whether a Channel composer accepts files: the person may create content and uploads are on. */
export const useCanUploadAttachments = () => {
  const { allowed } = usePermission('create_content');
  const enableUpload = useServerConfigStore((s) => featureFlagsSelectors(s).enableKnowledgeBase);
  return { allowed, canUpload: allowed && !!enableUpload, enableUpload };
};
