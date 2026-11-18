import { cssVar, Image } from '@lobehub/ui';
import type { ComponentProps } from 'react';
import { memo, useEffect, useMemo, useState } from 'react';

import { useLocalFileImagePreview, useLocalFilePreviewStore } from '@/store/localFilePreview';

import { resolveMarkdownRelativeAssetPath } from './Body.helpers';

interface MarkdownImageProps extends ComponentProps<'img'> {
  deviceId?: string;
  markdownFilePath: string;
  node?: unknown;
  workingDirectory: string;
}

const MarkdownImage = memo<MarkdownImageProps>(
  ({ alt, className, deviceId, markdownFilePath, node, src, style, workingDirectory }) => {
    void node;

    const markdownSrc = typeof src === 'string' ? src : undefined;
    const resolvedPath = useMemo(
      () => resolveMarkdownRelativeAssetPath({ markdownFilePath, src: markdownSrc }),
      [markdownFilePath, markdownSrc],
    );

    const target = useMemo(
      () => (resolvedPath ? { deviceId, filePath: resolvedPath, workingDirectory } : undefined),
      [deviceId, resolvedPath, workingDirectory],
    );
    useLocalFilePreviewStore((s) => s.useFetchImagePreview)(target);
    const preview = useLocalFileImagePreview(target);

    const [imageSrc, setImageSrc] = useState<string>();

    useEffect(() => {
      if (!resolvedPath || preview?.type !== 'image') {
        setImageSrc(undefined);
        return;
      }

      const objectUrl = URL.createObjectURL(preview.blob);
      setImageSrc(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }, [preview, resolvedPath]);

    if (resolvedPath && !imageSrc) {
      return (
        <span
          aria-label={alt}
          role={alt ? 'img' : undefined}
          title={markdownSrc}
          style={{
            background: cssVar.colorFillQuaternary,
            borderRadius: 6,
            display: 'inline-block',
            minHeight: 120,
            width: 'min(100%, 320px)',
          }}
        />
      );
    }

    const resolvedSrc = imageSrc ?? markdownSrc;

    return (
      <Image
        alt={alt}
        classNames={className ? { image: className } : undefined}
        objectFit={'contain'}
        src={resolvedSrc}
        styles={{ image: { maxWidth: '100%', ...style } }}
        variant={'borderless'}
      />
    );
  },
);

MarkdownImage.displayName = 'MarkdownImage';

export default MarkdownImage;
