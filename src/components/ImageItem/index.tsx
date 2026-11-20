import { type ImageProps } from '@lobehub/ui';
import { ActionIcon, Image } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { Trash } from 'lucide-react';
import { type CSSProperties } from 'react';
import { memo } from 'react';

import { cachedMediaUrl } from '@/libs/mediaCache/cachedMediaUrl';
import { sx } from '@/styles/sx';

import { MIN_IMAGE_SIZE } from './style';

const styles = stylex.create({
  deleteButton: {
    color: cssVar.colorTextLightSolid,
    backgroundColor: { 'default': cssVar.colorBgMask, ':hover': cssVar.colorError },
    backgroundImage: { 'default': 'none', ':hover': 'none' },
  },
  editableImage: {
    backgroundColor: cssVar.colorBgContainer,
    backgroundImage: 'none',
    boxShadow: `0 0 0 1px ${cssVar.colorFill} inset`,
  },
  image: { marginBlock: '0' },
});

interface ImageItemProps {
  alt?: string;
  alwaysShowClose?: boolean;
  className?: string;
  editable?: boolean;
  height?: number;
  loading?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  preview?: ImageProps['preview'];
  ratio?: number;
  /**
   * Multi-image tiles share one square. Cover it, otherwise a wide image sits
   * on the gray fill and leaves a band underneath.
   */
  square?: boolean;
  style?: CSSProperties;
  url?: string;
  width?: number;
}

const ImageItem = memo<ImageItemProps>(
  ({
    className,
    style,
    editable,
    alt,
    onRemove,
    url,
    loading,
    alwaysShowClose,
    preview,
    ratio,
    square,
    width,
    height,
  }) => {
    const IMAGE_SIZE = editable ? MIN_IMAGE_SIZE : '100%';
    const aspectRatio = square
      ? 1
      : ratio && ratio > 0
        ? ratio
        : width && width > 0 && height && height > 0
          ? width / height
          : undefined;

    return (
      <Image
        alt={alt || ''}
        alwaysShowActions={alwaysShowClose}
        height={square ? '100%' : 'auto'}
        isLoading={loading}
        objectFit={square ? 'cover' : undefined}
        preview={preview}
        size={IMAGE_SIZE}
        src={cachedMediaUrl(url) ?? url}
        actions={
          editable && (
            <ActionIcon
              glass
              className={stylex.props(styles.deleteButton).className}
              icon={Trash}
              size={'small'}
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
            />
          )
        }
        classNames={{
          wrapper: sx(styles.image, editable && styles.editableImage, className).className,
        }}
        style={{
          aspectRatio,
          // Follow the bitmap, ratio known or not: the grid's 64px min-height and row
          // stretch would otherwise make a wide image's tile taller than the image,
          // leaving the gray fill showing underneath.
          height: 'auto',
          alignSelf: 'start',
          minHeight: 'auto',
          width: '100%',
          ...style,
        }}
        styles={
          square
            ? {
                // The bitmap is taken out of flow so the square comes from aspect-ratio,
                // and cover fills that square instead of leaving the fill color below.
                image: { height: '100%', objectFit: 'cover', width: '100%' },
                wrapper: { height: '100%', inset: 0, position: 'absolute', width: '100%' },
              }
            : undefined
        }
      />
    );
  },
);

export default ImageItem;
