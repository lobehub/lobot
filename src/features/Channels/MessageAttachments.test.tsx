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
vi.mock('@lobehub/ui', async (importOriginal) => {
  const { createElement } = await import('react');
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    copyToClipboard,
    createModal,
    // Menu items render inline so the test can see and click them.
    DropdownMenu: ({ items }: { items: { key: string; onClick: () => void }[] }) =>
      createElement(
        'ul',
        { 'aria-label': 'menu' },
        items.map((item) =>
          createElement('li', { key: item.key, onClick: item.onClick }, item.key),
        ),
      ),
  };
});

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

  it('puts the preview title actions behind a menu that copies a link that does not expire', () => {
    render(<MessageAttachments attachments={[zip]} fileIds={['file_Z']} />);
    fireEvent.click(screen.getByText('icons.zip'));

    const { title } = createModal.mock.calls[0][0];
    cleanup();
    render(title);
    expect(screen.getByText('icons.zip')).toBeTruthy();
    // Only the name and the menu, no loose icon buttons.
    expect(screen.queryByRole('button', { name: 'attachments.download' })).toBeNull();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'copyLink',
      'download',
    ]);
    fireEvent.click(screen.getByText('copyLink'));

    expect(copyToClipboard).toHaveBeenCalledWith('https://app.lobehub.com/f/file_Z?download=1');
  });

  it('plays an MP4 inline through the proxy, which re-signs the URL on every request', () => {
    const { container } = render(
      <MessageAttachments
        fileIds={['file_V']}
        attachments={[
          {
            fileType: 'video/mp4',
            id: 'file_V',
            name: 'demo.mp4',
            size: 1,
            url: 'https://s3.example.com/demo.mp4?X-Amz-Expires=300',
          },
        ]}
      />,
    );

    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      'https://app.lobehub.com/f/file_V',
    );
    expect(screen.queryByRole('button', { name: 'attachments.download' })).toBeNull();
  });

  it('plays an upper-case .MP4 the browser uploaded without a video type', () => {
    const { container } = render(
      <MessageAttachments
        fileIds={['file_V']}
        attachments={[
          { fileType: '', id: 'file_V', name: '2358.MP4', size: 1, url: 'https://cdn/2358.MP4' },
        ]}
      />,
    );

    expect(container.querySelector('video')).toBeTruthy();
  });

  it('keeps audio and unplayable video containers as file cards', () => {
    const { container } = render(
      <MessageAttachments
        fileIds={['file_M', 'file_A']}
        attachments={[
          { fileType: 'audio/mp4', id: 'file_M', name: 'voice.m4a', size: 1, url: 'https://cdn/m' },
          {
            fileType: 'video/x-msvideo',
            id: 'file_A',
            name: 'old.avi',
            size: 1,
            url: 'https://cdn/a',
          },
        ]}
      />,
    );

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'attachments.download' })).toHaveLength(2);
  });

  it('falls back to the file card when the video cannot be decoded', () => {
    const { container } = render(
      <MessageAttachments
        fileIds={['file_V']}
        attachments={[
          {
            fileType: 'video/quicktime',
            id: 'file_V',
            name: 'hevc.mov',
            size: 1,
            url: 'https://cdn/v',
          },
        ]}
      />,
    );

    fireEvent.error(container.querySelector('video')!);

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByText('hevc.mov')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'attachments.download' })).toBeTruthy();
  });
});
