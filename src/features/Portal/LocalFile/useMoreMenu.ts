import { type PortalMoreMenuConfig } from '@/features/Portal/components/PortalMoreMenu/types';
import { useChatStore } from '@/store/chat';
import { chatPortalSelectors } from '@/store/chat/selectors';
import { useLocalFilePreviewStore } from '@/store/localFilePreview';

export const useLocalFileMoreMenu = (): PortalMoreMenuConfig | undefined => {
  const file = useChatStore(chatPortalSelectors.currentLocalFile);

  if (!file) return;

  // A local file has no server id or shareable URL — its handle is the path.
  return {
    copyPath: file.filePath,
    // Re-reads the portal body's preview and the inline image previews of the same file.
    refresh: () =>
      useLocalFilePreviewStore
        .getState()
        .refreshPreview({ ...file, allowExternalFile: file.allowExternalFilePreview }),
  };
};
