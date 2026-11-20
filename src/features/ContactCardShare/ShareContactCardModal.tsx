'use client';

import {
  ActionIcon,
  Avatar,
  Button,
  Center,
  Checkbox,
  createModal,
  Flexbox,
  Icon,
  SearchBar,
  Text,
  TextArea,
  toast,
  useModalContext,
} from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ContactCard, ContactCardInput } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { t as translate } from 'i18next';
import { HashIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { openShareAgentModal } from '@/features/ContactList/ShareAgentModal';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';
import { useCurrentProjectList } from '@/store/project';

import { ContactCardPreview } from './ContactCardMessage';
import { sendCardToChannels } from './shareSend';
import { buildShareTargets, filterShareTargets, type ShareChannelTarget } from './shareTargets';

/** Fixed so the window does not jump while the list filters down to nothing. */
const BODY_HEIGHT = 480;
const ROW_AVATAR = 32;
const CHIP_AVATAR = 28;

/** What the card shows before the server snapshots it: the sharer's view of the Agent. */
export interface AgentCardPreview {
  avatar: string | null;
  backgroundColor?: string | null;
  name: string;
  ownerName?: string | null;
}

const styles = stylex.create({
  pane: {
    minWidth: 0,
    paddingBlock: 16,
    paddingInline: 16,
  },
  picker: {
    flex: '1',
    borderInlineEndWidth: 1,
    borderInlineEndStyle: 'solid',
    borderInlineEndColor: cssVar.colorBorderSecondary,
  },
  side: {
    width: 320,
    flexShrink: 0,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingBlock: 8,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: cssVar.borderRadius,
    font: 'inherit',
    color: cssVar.colorText,
    textAlign: 'start',
    backgroundColor: {
      'default': 'transparent',
      ':hover': cssVar.colorFillTertiary,
    },
    cursor: 'pointer',
  },
  name: {
    flex: '1',
    minWidth: 0,
  },
  scroll: {
    flex: '1',
    minHeight: 0,
    overflowY: 'auto',
  },
});

const TargetAvatar = ({ size, target }: { size: number; target: ShareChannelTarget }) => {
  if (target.kind === 'user')
    return <UserAvatar avatar={target.avatar} name={target.name} shape={'circle'} size={size} />;
  if (target.kind === 'agent')
    return (
      <AgentAvatar
        agentId={target.channel.agentId ?? target.channel.id}
        avatar={target.avatar}
        background={target.backgroundColor || undefined}
        name={target.name}
        size={size}
      />
    );
  return (
    <Avatar
      avatar={<Icon color={cssVar.colorTextSecondary} icon={HashIcon} size={size / 2} />}
      background={cssVar.colorFillSecondary}
      shape={'circle'}
      size={size}
    />
  );
};

/** The card the dialog previews, from what the sharer already has of the person or Agent. */
const usePreviewCard = (
  card: ContactCardInput,
  agent: AgentCardPreview | undefined,
): ContactCard | undefined => {
  const userId = card.type === 'user' ? card.userId : undefined;
  contactActions.useFetchProfile(userId);
  const user = useContactStore((s) =>
    userId ? contactSelectors.profile(userId)(s)?.user : undefined,
  );

  if (card.type === 'agent')
    return agent
      ? {
          agentId: card.agentId,
          avatar: agent.avatar,
          backgroundColor: agent.backgroundColor ?? null,
          name: agent.name,
          ownerName: agent.ownerName ?? null,
          shareId: '',
          type: 'agent',
        }
      : undefined;
  return user
    ? {
        avatar: user.avatar,
        name: user.fullName || user.username,
        type: 'user',
        userId: user.id,
        username: user.username,
      }
    : undefined;
};

/**
 * A chat app's forward dialog: conversations to tick on the left; on the right who it goes to,
 * the card as it will read, and a note sent after it.
 */
const ShareContactCardContent = ({
  agent,
  card,
}: {
  agent?: AgentCardPreview;
  card: ContactCardInput;
}) => {
  const { t } = useTranslation('channel');
  const { close } = useModalContext();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  channelActions.useFetchList();
  const channels = useChannelStore(channelSelectors.list);
  const projects = useCurrentProjectList();
  const preview = usePreviewCard(card, agent);
  const targets = useMemo(
    () =>
      buildShareTargets(
        channels ?? [],
        (projectId) => projects.find((project) => project.id === projectId)?.name,
        card,
      ),
    [card, channels, projects],
  );
  const visible = filterShareTargets(targets, query);
  const chosen = selected
    .map((id) => targets.find((target) => target.channel.id === id))
    .filter((target): target is ShareChannelTarget => !!target);

  const toggle = (id: string) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));

  const send = async () => {
    setSending(true);
    const { errorKey, sent } = await sendCardToChannels({
      card,
      channelIds: chosen.map((target) => target.channel.id),
      note,
      sendCard: (channelId) => channelActions.sendContactCard({ card, channelId }),
      sendNote: (channelId, content) =>
        channelActions.queueSend({
          attachments: [],
          channelId,
          content,
          fileIds: [],
          mentions: [],
        }),
    });
    setSending(false);

    if (!errorKey) {
      toast.success(
        sent.length === 1
          ? t('contactCard.share.sent', { name: chosen[0].name })
          : t('contactCard.share.sentCount', { count: sent.length }),
      );
      close();
      return;
    }
    toast.error(t(errorKey));
    // The sender's own Agent needs its share link first: hand over to where it is turned on.
    if (errorKey === 'contactCard.error.agentNotShared' && card.type === 'agent') {
      close();
      openShareAgentModal(card.agentId);
      return;
    }
    // Keep only what did not go, so sending again does not repeat a card.
    setSelected((ids) => ids.filter((id) => !sent.includes(id)));
    if (sent.length > 0) setNote('');
  };

  return (
    <Flexbox horizontal height={BODY_HEIGHT}>
      <Flexbox gap={8} {...stylex.props(styles.pane, styles.picker)}>
        <SearchBar
          allowClear
          autoFocus
          placeholder={t('contactCard.share.search')}
          value={query}
          onInputChange={setQuery}
        />
        {channels && visible.length === 0 ? (
          <Center flex={1} paddingInline={16}>
            <Text fontSize={12} type={'secondary'}>
              {t('contactCard.share.empty')}
            </Text>
          </Center>
        ) : (
          <div {...stylex.props(styles.scroll)}>
            {visible.map((target) => {
              const checked = selected.includes(target.channel.id);
              return (
                <button
                  aria-pressed={checked}
                  disabled={sending}
                  key={target.channel.id}
                  type={'button'}
                  onClick={() => toggle(target.channel.id)}
                  {...stylex.props(styles.row)}
                >
                  <Checkbox checked={checked} shape={'circle'} style={{ pointerEvents: 'none' }} />
                  <TargetAvatar size={ROW_AVATAR} target={target} />
                  <Text ellipsis {...stylex.props(styles.name)}>
                    {target.name}
                  </Text>
                </button>
              );
            })}
          </div>
        )}
      </Flexbox>
      <Flexbox gap={12} {...stylex.props(styles.pane, styles.side)}>
        <Text weight={500}>{t('contactCard.share.sendTo')}</Text>
        <div {...stylex.props(styles.scroll)}>
          {chosen.length === 0 ? (
            <Center height={'100%'}>
              <Text fontSize={12} type={'secondary'}>
                {t('contactCard.share.noTarget')}
              </Text>
            </Center>
          ) : (
            chosen.map((target) => (
              <Flexbox
                horizontal
                align={'center'}
                gap={10}
                key={target.channel.id}
                paddingBlock={6}
              >
                <TargetAvatar size={CHIP_AVATAR} target={target} />
                <Text ellipsis {...stylex.props(styles.name)}>
                  {target.name}
                </Text>
                <ActionIcon
                  disabled={sending}
                  icon={XIcon}
                  size={'small'}
                  title={t('contactCard.share.remove')}
                  onClick={() => toggle(target.channel.id)}
                />
              </Flexbox>
            ))
          )}
        </div>
        {preview && <ContactCardPreview card={preview} />}
        <TextArea
          autoSize={{ maxRows: 4, minRows: 2 }}
          disabled={sending}
          placeholder={t('contactCard.share.note')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Flexbox horizontal gap={8} justify={'flex-end'}>
          <Button disabled={sending} onClick={close}>
            {t('contactCard.share.cancel')}
          </Button>
          <Button
            disabled={chosen.length === 0}
            loading={sending}
            type={'primary'}
            onClick={() => void send()}
          >
            {chosen.length > 1
              ? t('contactCard.share.sendCount', { count: chosen.length })
              : t('contactCard.share.send')}
          </Button>
        </Flexbox>
      </Flexbox>
    </Flexbox>
  );
};

const openShareContactCardModal = (card: ContactCardInput, agent?: AgentCardPreview) =>
  createModal({
    content: <ShareContactCardContent agent={agent} card={card} />,
    footer: null,
    maskClosable: true,
    // The two panes bring their own padding and the line between them runs edge to edge.
    styles: { content: { padding: 0 } },
    title: translate(card.type === 'user' ? 'shareCard' : 'shareAgent', { ns: 'channel' }),
    width: 'min(92%, 760px)',
  });

/** "Share Agent": picks the sender's conversations and sends the Agent's card there. */
export const openShareAgentCardModal = (agentId: string, preview?: AgentCardPreview) =>
  openShareContactCardModal({ agentId, type: 'agent' }, preview);

/** "Share card": picks the sender's conversations and sends a person's card there. */
export const openShareUserCardModal = (userId: string) =>
  openShareContactCardModal({ type: 'user', userId });
