import type { ModelIcon as LobeModelIcon, ModelTag as LobeModelTag } from '@lobehub/icons';
import { Skeleton } from '@lobehub/ui';
import type { ComponentProps } from 'react';
import { lazy, Suspense } from 'react';

// The catalog-backed features of @lobehub/icons statically import every brand
// icon (~3 MB). Mounting them through lazy() keeps that catalog in one shared
// chunk that loads after paint instead of inside each route's closure.
const LazyModelIcon = lazy(() => import('@lobehub/icons/es/features/ModelIcon'));
const LazyModelTag = lazy(() => import('@lobehub/icons/es/features/ModelTag'));

const DEFAULT_SIZE = 24;

export const ModelIcon = (props: ComponentProps<typeof LobeModelIcon>) => {
  const size = props.size ?? DEFAULT_SIZE;
  return (
    <Suspense fallback={<Skeleton height={size} width={size} />}>
      <LazyModelIcon {...props} />
    </Suspense>
  );
};

export const ModelTag = (props: ComponentProps<typeof LobeModelTag>) => (
  <Suspense fallback={<Skeleton height={22} width={96} />}>
    <LazyModelTag {...props} />
  </Suspense>
);
