'use client';

import { Button, Center, Flexbox, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { DownloadIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FileIcon from '@/components/FileIcon';
import { downloadFile } from '@/utils/client/downloadFile';
import { formatSize } from '@/utils/format';

const styles = stylex.create({
  card: {
    width: '100%',
    maxWidth: '360px',
    paddingBlock: '32px',
    paddingInline: '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBorderSecondary,
    borderRadius: cssVar.borderRadiusLG,
    textAlign: 'center',
    backgroundColor: cssVar.colorBgContainer,
  },
  name: {
    maxWidth: '100%',
    fontWeight: 500,
    wordBreak: 'break-all',
  },
});

interface ArchiveViewerProps {
  fileName?: string;
  size?: number;
  url?: string | null;
}

/**
 * Archives can't be previewed, so instead of the generic "unsupported format"
 * empty state, say plainly that this is an archive and point at the download.
 */
const ArchiveViewer = memo<ArchiveViewerProps>(({ fileName, size, url }) => {
  const { t } = useTranslation('file');
  const [loading, setLoading] = useState(false);
  const ext = fileName?.split('.').pop()?.toUpperCase();

  return (
    <Center height={'100%'} id="archive-renderer" padding={24} width={'100%'}>
      <Flexbox align={'center'} className={stylex.props(styles.card).className} gap={16}>
        <FileIcon fileName={fileName || 'archive.zip'} size={56} />
        <Flexbox align={'center'} gap={4} width={'100%'}>
          {fileName && <Text className={stylex.props(styles.name).className}>{fileName}</Text>}
          <Text fontSize={12} type={'secondary'}>
            {[t('preview.archive.label', { ext: ext || 'ZIP' }), !!size && formatSize(size)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Flexbox>
        <Text type={'secondary'}>{t('preview.archive.desc')}</Text>
        {url && (
          <Button
            icon={DownloadIcon}
            loading={loading}
            type={'primary'}
            onClick={async () => {
              setLoading(true);
              try {
                await downloadFile(url, fileName || 'download');
              } finally {
                setLoading(false);
              }
            }}
          >
            {t('preview.downloadFile')}
          </Button>
        )}
      </Flexbox>
    </Center>
  );
});

export default ArchiveViewer;
