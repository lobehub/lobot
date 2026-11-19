import { buildFileCacheUrl, isDesktop } from '@lobechat/const';
import { createModal, Flexbox } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import { useState } from 'react';

import MessageVideo from '@/components/MessageVideo';
import FileListViewer from '@/features/Conversation/Messages/User/components/FileListViewer';
import ImageFileListViewer from '@/features/Conversation/Messages/User/components/ImageFileListViewer';
import FileViewer from '@/features/FileViewer';
import { useAppOrigin } from '@/hooks/useAppOrigin';

import { AttachmentPreviewTitle, DownloadAttachmentButton } from './AttachmentActions';

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
      // A column that fills the modal body, so a viewer without a preview fills it too.
      <Flexbox height={'100%'}>
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
      </Flexbox>
    ),
    footer: null,
    maskClosable: true,
    styles: { content: { height: '80vh', minHeight: 0, overflow: 'auto', padding: 0 } },
    title: <AttachmentPreviewTitle file={file} />,
    width: 'min(90vw, 1024px)',
  });

/**
 * The server signs attachment URLs for minutes while the conversation is persisted, so a reopened
 * Channel would render expired URLs. On desktop an image loads through the file-id disk cache.
 */
const imageUrl = (file: { id: string; name: string; url: string }) =>
  isDesktop ? buildFileCacheUrl(file) : file.url;

/** File cards stretch to the message width by default, which reads badly in a wide Channel. */
const FILE_CARD_MAX_WIDTH = 400;

/** Containers Chromium can usually play inline; anything else stays a file card. */
const PLAYABLE_VIDEO_TYPES = new Set(['video/mp4', 'video/ogg', 'video/quicktime', 'video/webm']);
// The browser may report an empty or generic type for an upload (`2358.MP4`), so the name counts.
const PLAYABLE_VIDEO_NAME = /\.(?:m4v|mov|mp4|ogv|webm)$/i;

const isPlayableVideo = (file: { fileType: string; name: string }) => {
  const fileType = file.fileType.toLowerCase();
  if (fileType.startsWith('audio/') || fileType.startsWith('image/')) return false;
  return PLAYABLE_VIDEO_TYPES.has(fileType) || PLAYABLE_VIDEO_NAME.test(file.name);
};

const FileCards = ({ files }: { files: Attachment[] }) => (
  <Flexbox style={{ maxWidth: FILE_CARD_MAX_WIDTH }}>
    <FileListViewer
      items={files}
      renderActions={(item) => <DownloadAttachmentButton file={item} />}
      onOpenFile={openFile}
    />
  </Flexbox>
);

/**
 * Plays a video inline. The signed URL expires minutes after the Channel loads, which would break
 * playback (and every later range request) in a reopened conversation, so the player loads the
 * `/f/:id` proxy, which redirects to a freshly signed URL on each request. A video the element
 * cannot decode (a HEVC `.mov`, say) falls back to its file card.
 */
const VideoAttachment = ({ file }: { file: Attachment }) => {
  const appOrigin = useAppOrigin();
  const [unplayable, setUnplayable] = useState(false);

  if (unplayable) return <FileCards files={[file]} />;

  return (
    <MessageVideo
      maxHeight={360}
      src={`${appOrigin}/f/${encodeURIComponent(file.id)}`}
      onError={() => setUnplayable(true)}
    />
  );
};

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
  const videos = files.filter(isPlayableVideo);
  const others = files.filter(
    (file) => !file.fileType.startsWith('image/') && !isPlayableVideo(file),
  );
  return (
    <Flexbox gap={8}>
      {images.length > 0 && (
        <ImageFileListViewer
          items={images.map((file) => ({ alt: file.name, id: file.id, url: imageUrl(file) }))}
        />
      )}
      {videos.map((file) => (
        <VideoAttachment file={file} key={file.id} />
      ))}
      {others.length > 0 && <FileCards files={others} />}
    </Flexbox>
  );
}
