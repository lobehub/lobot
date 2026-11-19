import { Flexbox } from '@lobehub/ui';
import { memo, type ReactNode } from 'react';

import { type ChatFileItem } from '@/types/index';

import FileItem from './Item';

interface FileListViewerProps {
  items: ChatFileItem[];
  /** Replaces the chat portal preview, for hosts that mount no portal. */
  onOpenFile?: (file: ChatFileItem) => void;
  /** Trailing controls for each card, e.g. a download button. */
  renderActions?: (file: ChatFileItem) => ReactNode;
}

const FileListViewer = memo<FileListViewerProps>(({ items, onOpenFile, renderActions }) => {
  return (
    <Flexbox gap={8}>
      {items.map((item) => (
        <FileItem
          key={item.id}
          {...item}
          actions={renderActions?.(item)}
          onClick={onOpenFile ? () => onOpenFile(item) : undefined}
        />
      ))}
    </Flexbox>
  );
});
export default FileListViewer;
