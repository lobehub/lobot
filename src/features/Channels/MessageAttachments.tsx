import { isDesktop } from '@lobechat/const';
import { createModal, Flexbox } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import { useState } from 'react';

import MessageVideo from '@/components/MessageVideo';
import FileListViewer from '@/features/Conversation/Messages/User/components/FileListViewer';
import ImageFileListViewer from '@/features/Conversation/Messages/User/components/ImageFileListViewer';
import FileViewer from '@/features/FileViewer';
import { useAppOrigin } from '@/hooks/useAppOrigin';
import { cachedMediaUrl } from '@/libs/mediaCache/cachedMediaUrl';

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
 * The server signs attachment URLs for minutes while the conversation is persisted. On desktop
 * the file id is the cache key, so a new signature still paints the copy already on disk.
 */
const imageUrl = (file: { id: string; name: string; url: string }) =>
  cachedMediaUrl(file.url, { id: file.id, name: file.name }) ?? file.url;

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
 * Plays a video inline. On desktop the file id names immutable bytes, so seeking and a later
 * visit read the disk copy instead of following `/f/:id` to a new signature. A cache miss with
 * an expired signature falls back to that proxy, which can still sign a fresh URL. A video the
 * element cannot decode (a HEVC `.mov`, say) falls back to its file card.
 */
const VideoAttachment = ({ file }: { file: Attachment }) => {
  const appOrigin = useAppOrigin();
  const [unplayable, setUnplayable] = useState(false);
  const proxy = `${appOrigin}/f/${encodeURIComponent(file.id)}`;
  const cached = isDesktop ? cachedMediaUrl(file.url, { id: file.id, name: file.name }) : undefined;
  const [src, setSrc] = useState(cached || proxy);

  if (unplayable) return <FileCards files={[file]} />;

  return (
    <MessageVideo
      maxHeight={360}
      openHref={proxy}
      src={src}
      onError={() => {
        if (src !== proxy) setSrc(proxy);
        else setUnplayable(true);
      }}
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
