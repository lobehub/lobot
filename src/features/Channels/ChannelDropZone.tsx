import type { ReactNode } from 'react';

import DragUploadZone from '@/components/DragUploadZone';

import { useAttachments } from './useAttachments';
import { useCanUploadAttachments } from './useCanUploadAttachments';

/** Fills the conversation's slot so the overlay covers the feed and the composer alike. */
const zoneStyle = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
} as const;

/**
 * Files dropped anywhere on a conversation, not only on its input, land in that composer's
 * attachments. A conversation covered by another panel takes no drops; with the thread panel
 * open beside the main conversation, only the one under the cursor shows the overlay.
 */
export function ChannelDropZone({
  children,
  disabled,
  draftKey,
}: {
  children: ReactNode;
  disabled?: boolean;
  /** The composer's draft the files join; see {@link useAttachments}. */
  draftKey: string;
}) {
  const attachments = useAttachments(draftKey);
  const { canUpload } = useCanUploadAttachments();
  return (
    <DragUploadZone
      overlayOnHover
      disabled={disabled || !canUpload}
      style={zoneStyle}
      onUploadFiles={attachments.upload}
    >
      {children}
    </DragUploadZone>
  );
}
