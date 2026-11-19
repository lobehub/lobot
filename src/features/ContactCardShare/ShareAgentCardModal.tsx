'use client';

import { Avatar, createModal, Icon, toast, useModalContext } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import { t as translate } from 'i18next';
import { HashIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { openShareAgentModal } from '@/features/ContactList/ShareAgentModal';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useCurrentProjectList } from '@/store/project';

import { PickerFrame, PickerRow } from './PickerList';
import { shareAgentErrorKey } from './shareErrors';
import { buildShareTargets, filterShareTargets, type ShareChannelTarget } from './shareTargets';

const ROW_AVATAR = 32;

const TargetAvatar = ({ target }: { target: ShareChannelTarget }) => {
  if (target.kind === 'user')
    return (
      <UserAvatar avatar={target.avatar} name={target.name} shape={'circle'} size={ROW_AVATAR} />
    );
  if (target.kind === 'agent')
    return (
      <AgentAvatar
        agentId={target.channel.agentId ?? target.channel.id}
        avatar={target.avatar}
        background={target.backgroundColor || undefined}
        name={target.name}
        size={ROW_AVATAR}
      />
    );
  return (
    <Avatar
      avatar={<Icon color={cssVar.colorTextSecondary} icon={HashIcon} size={16} />}
      background={cssVar.colorFillSecondary}
      shape={'circle'}
      size={ROW_AVATAR}
    />
  );
};

/** The conversations of the active scope; picking one sends the Agent's card there. */
const ShareAgentCardContent = ({ agentId }: { agentId: string }) => {
  const { t } = useTranslation('channel');
  const { close } = useModalContext();
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState<string>();
  channelActions.useFetchList();
  const channels = useChannelStore(channelSelectors.list);
  const projects = useCurrentProjectList();
  const targets = useMemo(
    () =>
      buildShareTargets(
        channels ?? [],
        (projectId) => projects.find((project) => project.id === projectId)?.name,
        agentId,
      ),
    [agentId, channels, projects],
  );
  const visible = filterShareTargets(targets, query);

  const send = async (target: ShareChannelTarget) => {
    setSending(target.channel.id);
    try {
      await channelActions.sendContactCard({
        card: { agentId, type: 'agent' },
        channelId: target.channel.id,
      });
      toast.success(t('contactCard.share.sent', { name: target.name }));
      close();
    } catch (error) {
      console.error('[channel] Failed to share the Agent card', error);
      const key = shareAgentErrorKey(error);
      toast.error(t(key));
      // The sender's own Agent needs its share link first: hand over to where it is turned on.
      if (key === 'contactCard.error.agentNotShared') {
        close();
        openShareAgentModal(agentId);
      }
    } finally {
      setSending(undefined);
    }
  };

  return (
    <PickerFrame
      empty={channels && visible.length === 0 ? t('contactCard.share.empty') : undefined}
      placeholder={t('contactCard.share.search')}
      query={query}
      onQueryChange={setQuery}
    >
      {visible.map((target) => (
        <PickerRow
          avatar={<TargetAvatar target={target} />}
          disabled={!!sending}
          key={target.channel.id}
          name={target.name}
          onClick={() => void send(target)}
        />
      ))}
    </PickerFrame>
  );
};

/** "Share Agent": picks one of the sender's conversations and sends the Agent's card there. */
export const openShareAgentCardModal = (agentId: string) =>
  createModal({
    content: <ShareAgentCardContent agentId={agentId} />,
    footer: null,
    maskClosable: true,
    title: translate('contactCard.share.title', { ns: 'channel' }),
    width: 'min(90%, 400px)',
  });
