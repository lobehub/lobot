import { ActionIcon, copyToClipboard, Flexbox, Text, toast } from '@lobehub/ui';
import { DownloadIcon, LinkIcon } from 'lucide-react';
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
      // Synchronous with the click, so popup blockers let the download through.
      onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
    />
  );
};

export const CopyAttachmentLinkButton = ({ file }: { file: AttachmentFile }) => {
  const { t } = useTranslation('channel');
  const downloadUrl = useAttachmentDownloadUrl(file);
  const label = t('attachments.copyLink');

  return (
    <ActionIcon
      aria-label={label}
      icon={LinkIcon}
      size="small"
      title={label}
      onClick={async () => {
        await copyToClipboard(downloadUrl);
        toast.success(t('attachments.copyLinkSuccess'));
      }}
    />
  );
};

/** Preview modal title: the file name, then the actions that work for any format. */
export const AttachmentPreviewTitle = ({ file }: { file: AttachmentFile & { name: string } }) => (
  <Flexbox horizontal align={'center'} gap={8} style={{ minWidth: 0 }}>
    <Text ellipsis>{file.name}</Text>
    <Flexbox horizontal align={'center'} flex={'none'} gap={2}>
      <CopyAttachmentLinkButton file={file} />
      <DownloadAttachmentButton file={file} />
    </Flexbox>
  </Flexbox>
);
