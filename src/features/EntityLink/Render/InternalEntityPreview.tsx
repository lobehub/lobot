'use client';

import {
  ActionIcon,
  Avatar,
  createStaticStyles,
  Flexbox,
  Freeze,
  Icon,
  Popover,
  Text,
} from '@lobehub/ui';
import {
  BadgeCheckIcon,
  BotIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  ExternalLink,
  FileTextIcon,
  TargetIcon,
} from 'lucide-react';
import { memo, type PropsWithChildren, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ArticleSkeleton } from '@/components/Skeleton';
import { cardPopoverProps } from '@/styles/cardPopover';
import { openTrustedExternalUrl } from '@/utils/openTrustedExternalUrl';

import {
  entityPreviewSelectors,
  type PreviewableReference,
  useEntityPreviewStore,
  useFetchEntityPreview,
} from '../store';
import { useAcceptanceBrowserUrl } from './useAcceptanceBrowserUrl';

const styles = createStaticStyles(({ css, cssVar }) => ({
  content: css`
    width: 320px;
    padding: 16px;
  `,
  description: css`
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;

    line-height: 1.55;
    color: ${cssVar.colorTextSecondary};
  `,
  icon: css`
    display: grid;
    flex: none;
    place-items: center;

    width: 36px;
    height: 36px;
    border-radius: ${cssVar.borderRadiusLG};

    color: ${cssVar.colorTextSecondary};

    background: ${cssVar.colorFillTertiary};
  `,
  title: css`
    overflow: hidden;

    font-weight: 600;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  type: css`
    font-size: 12px;
    color: ${cssVar.colorTextTertiary};
  `,
}));

interface InternalEntityPreviewProps extends PropsWithChildren {
  fallbackTitle: string;
  reference: PreviewableReference;
}

export const InternalEntityPreview = memo<InternalEntityPreviewProps>(
  ({ children, fallbackTitle, reference }) => {
    const { i18n, t } = useTranslation('chat');
    const { t: tVerify } = useTranslation('verify');
    const [open, setOpen] = useState(false);
    // A click on the link opens the acceptance in the side panel; this is the
    // explicit way out to a full browser page.
    const browserUrl = useAcceptanceBrowserUrl(reference);
    const params = useMemo(
      () => ({ locale: i18n.language, reference }),
      [i18n.language, reference],
    );
    const { error } = useFetchEntityPreview(open ? params : null);
    const data = useEntityPreviewStore(entityPreviewSelectors.preview(params));
    const isLoading = data === undefined && !error;

    const icon =
      reference.type === 'acceptance'
        ? BadgeCheckIcon
        : reference.type === 'agent'
          ? BotIcon
          : reference.type === 'goal'
            ? TargetIcon
            : reference.type === 'task'
              ? CheckSquareIcon
              : reference.type === 'verify'
                ? CheckCircleIcon
                : FileTextIcon;
    const typeLabel = t(`internalLink.preview.${reference.type}`);

    const content = isLoading ? (
      <div className={styles.content}>
        <ArticleSkeleton avatar rows={2} />
      </div>
    ) : (
      <Flexbox className={styles.content} gap={12}>
        <Flexbox horizontal align="center" gap={12}>
          {reference.type === 'agent' && data?.avatar ? (
            <Avatar
              avatar={data.avatar}
              background={data.backgroundColor ?? undefined}
              shape="square"
              size={36}
            />
          ) : (
            <span className={styles.icon}>
              <Icon icon={icon} size={19} />
            </span>
          )}
          <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
            <span className={styles.type}>{typeLabel}</span>
            <span className={styles.title}>{data?.title || fallbackTitle}</span>
          </Flexbox>
          {browserUrl && (
            <ActionIcon
              icon={ExternalLink}
              size={'small'}
              title={tVerify('report.actions.openInBrowser')}
              onClick={() => openTrustedExternalUrl(browserUrl)}
            />
          )}
        </Flexbox>
        {data?.description && (
          <Text className={styles.description} fontSize={13}>
            {data.description}
          </Text>
        )}
        {data?.meta && (
          <Text fontSize={12} type={'secondary'}>
            {data.meta}
          </Text>
        )}
        {data?.secondaryMeta && (
          <Text fontSize={12} type={'secondary'}>
            {data.secondaryMeta}
          </Text>
        )}
      </Flexbox>
    );

    return (
      <Popover
        {...cardPopoverProps}
        // Keep the card as it was while the exit animation runs.
        content={<Freeze frozen={!open}>{content}</Freeze>}
        mouseEnterDelay={0.35}
        open={open}
        placement="top"
        trigger="hover"
        triggerProps={{ role: 'link' }}
        onOpenChange={setOpen}
      >
        {children}
      </Popover>
    );
  },
);

InternalEntityPreview.displayName = 'InternalEntityPreview';
