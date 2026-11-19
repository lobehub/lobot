/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FileListItem } from '@/types/files';

import FileViewer from './index';

const baseFile: FileListItem = {
  chunkCount: null,
  chunkingError: null,
  createdAt: new Date(),
  embeddingError: null,
  fileType: 'application/zip',
  finishEmbedding: false,
  id: 'file_zip',
  name: 'Lobot_icons.zip',
  size: 2048,
  sourceType: 'file',
  updatedAt: new Date(),
  url: 'https://s3/Lobot_icons.zip',
};

describe('FileViewer archive entry', () => {
  it('renders the archive card with a download instead of the feedback empty state', () => {
    const { container } = render(<FileViewer {...baseFile} />);

    expect(container.querySelector('#archive-renderer')).not.toBeNull();
    expect(container.querySelector('#not-support-renderer')).toBeNull();
    expect(container.querySelector('a[href]')).toBeNull();
    expect(screen.getByText('Lobot_icons.zip')).toBeTruthy();
    expect(screen.getByText('preview.archive.desc')).toBeTruthy();
    expect(screen.getByText('preview.downloadFile')).toBeTruthy();
  });

  it('matches archives by extension when the MIME type is generic', () => {
    const { container } = render(
      <FileViewer {...baseFile} fileType={'application/octet-stream'} name={'logs.tar.gz'} />,
    );

    expect(container.querySelector('#archive-renderer')).not.toBeNull();
  });
});
