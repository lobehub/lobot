import { ActionIcon, copyToClipboard, DropdownMenu, Flexbox, Text, toast } from '@lobehub/ui';
import { DownloadIcon, LinkIcon, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getFileDownloadUrl } from '@/features/EditorCanvas/fileDownload';
import { useAppOrigin } from '@/hooks/useAppOrigin';

interface AttachmentFile {
  id: string;
  url: string;
}

/**
 * A Channel hands out storage URLs signed for five minutes, so neither a download
 * started later nor a copied link may use them. The `/f/:id?download=1` proxy
 * signs a fresh URL on every request and saves the file under its own name.
 */
const useAttachmentDownloadUrl = (file: AttachmentFile) =>
  getFileDownloadUrl(file.url, { appOrigin: useAppOrigin(), fileId: file.id });

// Synchronous with the click, so popup blockers let the download through.
const openDownload = (downloadUrl: string) =>
  window.open(downloadUrl, '_blank', 'noopener,noreferrer');

export const DownloadAttachmentButton = ({ file }: { file: AttachmentFile }) => {
  const { t } = useTranslation('channel');
  const downloadUrl = useAttachmentDownloadUrl(file);
  const label = t('attachments.download');

  return (
    <ActionIcon
      aria-label={label}
      icon={DownloadIcon}
      size="small"
      title={label}
      onClick={() => openDownload(downloadUrl)}
    />
  );
};

/** Preview modal title: the file name, with its actions behind "more". */
export const AttachmentPreviewTitle = ({ file }: { file: AttachmentFile & { name: string } }) => {
  const { t } = useTranslation(['channel', 'common']);
  const downloadUrl = useAttachmentDownloadUrl(file);

  return (
    <Flexbox horizontal align={'center'} gap={8} style={{ minWidth: 0 }}>
      <Text ellipsis>{file.name}</Text>
      <DropdownMenu
        items={[
          {
            icon: LinkIcon,
            key: 'copyLink',
            label: t('attachments.copyLink'),
            onClick: async () => {
              await copyToClipboard(downloadUrl);
              toast.success(t('attachments.copyLinkSuccess'));
            },
          },
          {
            icon: DownloadIcon,
            key: 'download',
            label: t('attachments.download'),
            onClick: () => openDownload(downloadUrl),
          },
        ]}
      >
        <ActionIcon
          aria-label={t('more', { ns: 'common' })}
          icon={MoreHorizontal}
          size="small"
          title={t('more', { ns: 'common' })}
        />
      </DropdownMenu>
    </Flexbox>
  );
};
