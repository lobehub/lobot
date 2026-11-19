/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageAttachments } from './MessageAttachments';

vi.mock('@lobechat/const', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isDesktop: true,
}));
vi.mock('@/features/FileViewer', () => ({ default: () => null }));
vi.mock('@/hooks/useAppOrigin', () => ({ useAppOrigin: () => 'https://app.lobehub.com' }));

const { copyToClipboard, createModal } = vi.hoisted(() => ({
  copyToClipboard: vi.fn(),
  createModal: vi.fn(),
}));
vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyToClipboard,
  createModal,
}));

const zip = {
  fileType: 'application/zip',
  id: 'file_Z',
  name: 'icons.zip',
  size: 6_400_000,
  url: 'https://s3.example.com/icons.zip?X-Amz-Expires=300',
};

describe('MessageAttachments', () => {
  it('loads a desktop image through the file-id cache instead of its expiring signed URL', () => {
    const signedUrl = 'https://s3.example.com/a.png?X-Amz-Expires=300';
    const { container } = render(
      <MessageAttachments
        fileIds={['file_A']}
        attachments={[
          { fileType: 'image/png', id: 'file_A', name: 'a.png', size: 1, url: signedUrl },
        ]}
      />,
    );

    const src = container.querySelector('img')?.getAttribute('src');
    expect(src).toBe(`lobe-file-cache://file/file_A/a.png?src=${encodeURIComponent(signedUrl)}`);
    expect(container.querySelector('img')?.parentElement?.parentElement?.style.aspectRatio).toBe(
      '',
    );
  });

  it('covers each square tile when a message has several images', () => {
    const { container } = render(
      <MessageAttachments
        fileIds={['file_A', 'file_B']}
        attachments={[
          { fileType: 'image/png', id: 'file_A', name: 'a.png', size: 1, url: 'https://cdn/a.png' },
          { fileType: 'image/png', id: 'file_B', name: 'b.png', size: 1, url: 'https://cdn/b.png' },
        ]}
      />,
    );

    const images = [...container.querySelectorAll('img')];
    expect(images).toHaveLength(2);
    for (const img of images) {
      expect(img.style.objectFit).toBe('cover');
      expect(img.parentElement?.style.position).toBe('absolute');
      expect(img.parentElement?.parentElement?.style.aspectRatio).toBe('1 / 1');
    }
  });

  it('downloads a file from its card through the proxy, without opening the preview', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<MessageAttachments attachments={[zip]} fileIds={['file_Z']} />);

    fireEvent.click(screen.getByRole('button', { name: 'attachments.download' }));

    expect(open).toHaveBeenCalledWith(
      'https://app.lobehub.com/f/file_Z?download=1',
      '_blank',
      'noopener,noreferrer',
    );
    expect(createModal).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('titles the preview with actions that copy a download link that does not expire', () => {
    render(<MessageAttachments attachments={[zip]} fileIds={['file_Z']} />);
    fireEvent.click(screen.getByText('icons.zip'));

    const { title } = createModal.mock.calls[0][0];
    cleanup();
    render(title);
    expect(screen.getByText('icons.zip')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'attachments.copyLink' }));

    expect(copyToClipboard).toHaveBeenCalledWith('https://app.lobehub.com/f/file_Z?download=1');
    expect(screen.getByRole('button', { name: 'attachments.download' })).toBeTruthy();
  });
});
