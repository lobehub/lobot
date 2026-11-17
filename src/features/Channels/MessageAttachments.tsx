import { buildFileCacheUrl, isDesktop } from '@lobechat/const';
import type { ChannelDetail } from '@lobot/types';
import { createModal, Flexbox } from '@lobehub/ui';

import FileListViewer from '@/features/Conversation/Messages/User/components/FileListViewer';
import ImageFileListViewer from '@/features/Conversation/Messages/User/components/ImageFileListViewer';
import FileViewer from '@/features/FileViewer';

type Attachment = ChannelDetail['attachments'][number];

const openFile = (file: {
  fileType: string;
  id: string;
  name: string;
  size: number;
  url: string;
}) =>
  createModal({
    content: (
      <FileViewer
        chunkCount={null}
        chunkingError={null}
        createdAt={new Date()}
        embeddingError={null}
        fileType={file.fileType}
        finishEmbedding={false}
        id={file.id}
        name={file.name}
        size={file.size}
        sourceType="upload"
        updatedAt={new Date()}
        url={file.url}
      />
    ),
    footer: null,
    maskClosable: true,
    styles: { content: { height: '80vh', minHeight: 0, overflow: 'auto', padding: 0 } },
    title: file.name,
    width: 'min(90vw, 1024px)',
  });

/**
 * The server signs attachment URLs for minutes while the conversation is persisted, so a reopened
 * Channel would render expired URLs. On desktop an image loads through the file-id disk cache.
 */
const imageUrl = (file: { id: string; name: string; url: string }) =>
  isDesktop ? buildFileCacheUrl(file) : file.url;

/** A Channel mounts no chat portal, so files open in the shared viewer inside a modal. */
export function MessageAttachments({
  attachments,
  fileIds,
}: {
  attachments: Attachment[];
  fileIds: string[];
}) {
  const files = fileIds.map(
    (id) =>
      attachments.find((file) => file.id === id) ?? {
        fileType: '',
        id,
        inaccessible: true,
        name: '',
        size: 0,
        url: '',
      },
  );
  const images = files.filter((file) => file.fileType.startsWith('image/'));
  const others = files.filter((file) => !file.fileType.startsWith('image/'));
  return (
    <Flexbox gap={8}>
      {images.length > 0 && (
        <ImageFileListViewer
          items={images.map((file) => ({ alt: file.name, id: file.id, url: imageUrl(file) }))}
        />
      )}
      {others.length > 0 && <FileListViewer items={others} onOpenFile={openFile} />}
    </Flexbox>
  );
}
