'use client';

import { Markdown, Skeleton, Text } from '@lobehub/ui';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkStore, workActions, workSelectors } from '@/store/work';

export interface ShareVisitorDocumentContentProps {
  documentId: string;
  shareId: string;
  topicId: string;
}

/**
 * Read-only body of a `document` Work opened from the agent-share visitor
 * surface. The visitor has no owner-scoped document access (the document
 * belongs to the CREATOR), so it is fetched through the share-authorized read
 * instead of the Portal's document viewer.
 */
const ShareVisitorDocumentContent = memo<ShareVisitorDocumentContentProps>(
  ({ documentId, shareId, topicId }) => {
    const { t } = useTranslation('chat');
    const params = useMemo(
      () => ({ documentId, shareId, topicId }),
      [documentId, shareId, topicId],
    );
    const { error } = workActions.useFetchShareVisitorDocument(params);
    const data = useWorkStore(workSelectors.shareVisitorDocument(params));

    if (error) return <Text type="secondary">{t('workingPanel.works.documentLoadError')}</Text>;
    if (!data) return <Skeleton height={160} radius={8} />;

    return <Markdown>{data.content ?? ''}</Markdown>;
  },
);

ShareVisitorDocumentContent.displayName = 'ShareVisitorDocumentContent';

export default ShareVisitorDocumentContent;
