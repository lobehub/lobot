import { render, screen, waitFor } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { projectFileService } from '@/services/projectFile';
import { initialLocalFilePreviewState, useLocalFilePreviewStore } from '@/store/localFilePreview';

import MarkdownImage from './MarkdownImage';

const mockImage = vi.hoisted(() => vi.fn());

vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Image: ({
    alt,
    classNames,
    objectFit,
    src,
    styles,
    variant,
  }: {
    alt?: string;
    classNames?: { image?: string };
    objectFit?: string;
    src?: string;
    styles?: { image?: CSSProperties };
    variant?: string;
  }) => {
    mockImage({ alt, classNames, objectFit, src, styles, variant });

    return (
      <img
        alt={alt}
        className={classNames?.image}
        data-object-fit={objectFit}
        data-testid="lobe-image"
        data-variant={variant}
        src={src}
        style={styles?.image}
      />
    );
  },
}));

vi.mock('@/services/projectFile', () => ({
  projectFileService: {
    getLocalFilePreview: vi.fn(),
  },
}));

describe('MarkdownImage', () => {
  beforeEach(() => {
    mockImage.mockClear();
    vi.mocked(projectFileService.getLocalFilePreview).mockReset();
    useLocalFilePreviewStore.setState(initialLocalFilePreviewState);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:markdown-image'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('renders remote markdown images with the LobeHub Image component', () => {
    render(
      <MarkdownImage
        alt="remote"
        className="markdown-img"
        markdownFilePath="/repo/report.md"
        src="https://example.com/screenshot.png"
        style={{ width: 320 }}
        workingDirectory="/repo"
      />,
    );

    const image = screen.getByTestId('lobe-image');
    expect(image).toHaveAttribute('src', 'https://example.com/screenshot.png');
    expect(image).toHaveClass('markdown-img');
    expect(image).toHaveStyle({ maxWidth: '100%', width: '320px' });
    expect(mockImage).toHaveBeenCalledWith(
      expect.objectContaining({
        objectFit: 'contain',
        src: 'https://example.com/screenshot.png',
        variant: 'borderless',
      }),
    );
    expect(projectFileService.getLocalFilePreview).not.toHaveBeenCalled();
  });

  it('resolves relative markdown images and renders the loaded blob through LobeHub Image', async () => {
    vi.mocked(projectFileService.getLocalFilePreview).mockResolvedValue({
      blob: new Blob(['image']),
      type: 'image',
    } as never);

    render(
      <MarkdownImage
        alt="local"
        deviceId="device-1"
        markdownFilePath="/repo/.records/report.md"
        src="assets/screenshot.png"
        workingDirectory="/repo"
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('lobe-image')).toHaveAttribute('src', 'blob:markdown-image'),
    );
    expect(projectFileService.getLocalFilePreview).toHaveBeenCalledWith({
      accept: 'image',
      allowExternalFile: undefined,
      deviceId: 'device-1',
      path: '/repo/.records/assets/screenshot.png',
      workingDirectory: '/repo',
    });
  });

  it('shows a stable placeholder while a relative markdown image is loading', () => {
    vi.mocked(projectFileService.getLocalFilePreview).mockReturnValue(new Promise(() => {}));

    render(
      <MarkdownImage
        alt="local"
        markdownFilePath="/repo/report.md"
        src="assets/screenshot.png"
        workingDirectory="/repo"
      />,
    );

    expect(screen.queryByTestId('lobe-image')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'local' })).toBeInTheDocument();
  });
});
