'use client';

import {
  Button,
  copyToClipboard,
  createModal,
  Flexbox,
  Input,
  Skeleton,
  Text,
  toast,
} from '@lobehub/ui';
import { t as translate } from 'i18next';
import { CopyIcon, Link2Icon } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AsyncError from '@/components/AsyncError';
import { webAppOrigin } from '@/features/Electron/navigation/webApp';
import { type AgentShareLinkItem } from '@/services/agentShare';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';

/** The visitor page of a share: its custom slug when set, else its id. */
export const agentShareLink = (share: AgentShareLinkItem): string =>
  `${webAppOrigin()}/a/${encodeURIComponent(share.shareConfig?.slug || share.id)}`;

const copyLink = async (link: string) => {
  try {
    await copyToClipboard(link);
    toast.success(translate('contacts.share.copied', { ns: 'common' }));
  } catch (error) {
    console.error('[contacts] Failed to copy the share link', error);
    toast.error(translate('operationFailed', { ns: 'common' }));
  }
};

/**
 * The Agent's share link. A link that is already on is shown ready to copy; otherwise one click
 * turns it on and copies it. Limits, slug and visitor tools stay in the web app's share settings.
 */
const ShareAgentContent = memo<{ agentId: string }>(({ agentId }) => {
  const { t } = useTranslation('common');
  const [creating, setCreating] = useState(false);
  const { error, revalidate } = contactActions.useFetchAgentShare(agentId);
  const entry = useContactStore(contactSelectors.agentShare(agentId));
  const data = entry?.share;

  const share = data?.visibility === 'link' ? data : undefined;
  const link = share ? agentShareLink(share) : undefined;

  const create = async () => {
    setCreating(true);
    try {
      const created = await contactActions.enableAgentLinkShare(agentId);
      await copyLink(agentShareLink(created));
    } catch (error) {
      console.error('[contacts] Failed to create the share link', error);
      toast.error(t('contacts.share.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  if (error && !entry)
    return (
      <Flexbox padding={20}>
        <AsyncError error={error} variant="inline" onRetry={() => void revalidate()} />
      </Flexbox>
    );

  return (
    <Flexbox gap={16} padding={20}>
      <Text type={'secondary'}>{t(link ? 'contacts.share.desc' : 'contacts.share.emptyDesc')}</Text>
      {entry === undefined ? (
        <Skeleton height={32} width={'100%'} />
      ) : link ? (
        <Flexbox horizontal gap={8}>
          <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <Button icon={CopyIcon} type={'primary'} onClick={() => void copyLink(link)}>
            {t('contacts.share.copy')}
          </Button>
        </Flexbox>
      ) : (
        <Button block icon={Link2Icon} loading={creating} type={'primary'} onClick={create}>
          {t('contacts.share.create')}
        </Button>
      )}
    </Flexbox>
  );
});

ShareAgentContent.displayName = 'ShareAgentContent';

/** Open the share dialog for one of the user's Agents. */
export const openShareAgentModal = (agentId: string) =>
  createModal({
    content: <ShareAgentContent agentId={agentId} />,
    footer: null,
    styles: { content: { padding: 0 } },
    title: translate('contacts.share.title', { ns: 'common' }),
    width: 'min(90%, 480px)',
  });
