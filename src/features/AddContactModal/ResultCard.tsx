'use client';

import { CHANNEL_URL } from '@lobechat/const';
import { Flexbox, Icon, Text, toast, useModalContext } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ContactSearchResult } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import type { LucideIcon } from 'lucide-react';
import {
  CheckIcon,
  IdCardIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  UserRoundPlusIcon,
} from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { AGENT_CONTACT_URL, PERSON_CONTACT_URL } from '@/features/ContactList/const';
import { useMessageSharedAgent } from '@/features/ContactList/useMessageSharedAgent';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { channelActions } from '@/store/channel';
import { contactActions } from '@/store/contact';

import { searchResultName } from './result';

const AVATAR_SIZE = 56;

const styles = stylex.create({
  card: {
    flexShrink: 0,
    borderRadius: '12px',
    paddingBlockStart: '20px',
    paddingBlockEnd: '8px',
    paddingInline: '20px',
    backgroundColor: cssVar.colorFillQuaternary,
  },
  section: {
    paddingBlock: '12px',
    borderBlockStartWidth: '1px',
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: cssVar.colorBorderSecondary,
  },
  label: {
    flexShrink: 0,
    width: '56px',
    fontSize: '13px',
    lineHeight: '22px',
    color: cssVar.colorTextTertiary,
  },
  value: {
    minWidth: 0,
    fontSize: '13px',
    lineHeight: '22px',
    color: cssVar.colorText,
    overflowWrap: 'anywhere',
  },
  clamp: {
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
  },
  actions: {
    display: 'grid',
    gridAutoColumns: 'minmax(0, 1fr)',
    gridAutoFlow: 'column',
    paddingBlock: '8px',
    borderBlockStartWidth: '1px',
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: cssVar.colorBorderSecondary,
  },
  // An IM-profile action: icon over label on the card itself, no button chrome.
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    paddingBlock: '8px',
    paddingInline: '4px',
    borderWidth: 0,
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '12px',
    lineHeight: '18px',
    color: cssVar.colorTextSecondary,
    cursor: 'pointer',
    backgroundColor: {
      'default': 'transparent',
      ':hover': cssVar.colorFillTertiary,
    },
    transitionProperty: 'background-color',
    transitionDuration: '0.15s',
  },
  tileDisabled: {
    cursor: 'default',
    opacity: 0.5,
    backgroundColor: 'transparent',
  },
  note: {
    paddingBlockStart: '16px',
    paddingBlockEnd: '8px',
    borderBlockStartWidth: '1px',
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: cssVar.colorBorderSecondary,
    fontSize: '12px',
    color: cssVar.colorTextTertiary,
    textAlign: 'center',
  },
});

interface TileProps {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  loading?: boolean;
  onClick?: () => void;
}

const Tile = ({ disabled, icon, label, loading, onClick }: TileProps) => (
  <button
    aria-busy={loading}
    disabled={disabled || loading}
    type="button"
    onClick={onClick}
    {...stylex.props(styles.tile, (disabled || loading) && styles.tileDisabled)}
  >
    <Icon icon={loading ? LoaderCircleIcon : icon} size={22} spin={loading} />
    <span>{label}</span>
  </button>
);

const InfoRow = ({ clamp, label, value }: { clamp?: boolean; label: string; value: string }) => (
  <Flexbox horizontal gap={12}>
    <span {...stylex.props(styles.label)}>{label}</span>
    <span title={value} {...stylex.props(styles.value, clamp && styles.clamp)}>
      {value}
    </span>
  </Flexbox>
);

/** What can be done with a result, given how it relates to me. */
const useResultActions = (result: ContactSearchResult): TileProps[] | string => {
  const { t } = useTranslation('common');
  const { close } = useModalContext();
  const navigate = useWorkspaceAwareNavigate();
  // In a workspace a request invites someone outside it to be its external contact.
  const inWorkspace = !!useActiveWorkspaceId();
  const [relation, setRelation] = useState(result.relation);
  const [pending, setPending] = useState<string>();
  const { message: messageAgent, opening } = useMessageSharedAgent(close);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setPending(key);
    try {
      await action();
    } catch (error) {
      console.error('[contacts] Contact action failed', error);
      toast.error(t('contacts.actionFailed'));
    } finally {
      setPending(undefined);
    }
  };
  const open = (url: string) => {
    close();
    navigate(url);
  };

  if (result.type === 'agent') {
    // Messaging needs nothing but the live share; contacts are an optional bookmark.
    const message: TileProps = {
      icon: MessageCircleIcon,
      label: t('contacts.sendMessage'),
      loading: opening,
      onClick: () => void messageAgent(result.agent),
    };
    if (relation === 'self') return [message];
    return [
      message,
      relation === 'none'
        ? {
            icon: UserRoundPlusIcon,
            label: t('contacts.agent.add'),
            loading: pending === 'add',
            onClick: () =>
              run('add', async () => {
                await contactActions.addAgent(result.agent.shareId);
                setRelation('contact');
                toast.success(t('contacts.agent.added'));
              }),
          }
        : {
            icon: IdCardIcon,
            label: t('contacts.viewProfile'),
            onClick: () => open(AGENT_CONTACT_URL(result.agent.agentId)),
          },
    ];
  }

  const userId = result.user.id;
  const viewProfile: TileProps = {
    icon: IdCardIcon,
    label: t('contacts.viewProfile'),
    onClick: () => open(PERSON_CONTACT_URL(userId)),
  };

  const message: TileProps = {
    icon: MessageCircleIcon,
    label: t('contacts.sendMessage'),
    loading: pending === 'message',
    onClick: () =>
      run('message', async () => {
        const channelId = await channelActions.openPeer(userId);
        if (channelId) open(CHANNEL_URL(channelId));
      }),
  };

  switch (relation) {
    case 'self': {
      return t('contacts.person.self');
    }
    // A fellow member of the workspace: reachable without being a contact.
    case 'member': {
      return [message, viewProfile];
    }
    case 'none': {
      return [
        {
          icon: UserRoundPlusIcon,
          label: inWorkspace ? t('contacts.external.invite') : t('contacts.person.request'),
          loading: pending === 'request',
          onClick: () =>
            run('request', async () => {
              const { status } = await contactActions.sendRequest(userId);
              setRelation(status === 'accepted' ? 'contact' : 'request_sent');
            }),
        },
      ];
    }
    case 'request_sent': {
      return [
        {
          disabled: true,
          icon: CheckIcon,
          label: inWorkspace ? t('contacts.external.inviteSent') : t('contacts.person.requestSent'),
        },
      ];
    }
    case 'contact': {
      return [message, viewProfile];
    }
    default: {
      // A request waiting for me: the profile has accept and decline.
      return [viewProfile];
    }
  }
};

/** One search hit as a profile card: who it is, a few facts, then what I can do with it. */
const ResultCard = memo<{ result: ContactSearchResult }>(({ result }) => {
  const { t } = useTranslation('common');
  const actions = useResultActions(result);
  const name = searchResultName(result, t('untitledAgent', { ns: 'chat' }));

  const handle = result.type === 'agent' ? result.agent.slug : result.user.username;
  const subtitle =
    result.type === 'agent'
      ? t('contacts.agent.byOwner', {
          name: result.agent.owner.fullName || result.agent.owner.username,
        })
      : result.relation === 'request_received'
        ? t('contacts.person.requestReceived')
        : result.relation === 'member'
          ? t('contacts.person.isMember')
          : undefined;
  const description = result.type === 'agent' ? result.agent.description?.trim() : undefined;

  return (
    <div {...stylex.props(styles.card)}>
      <Flexbox horizontal align={'center'} gap={16} paddingBlock={'0 16px'}>
        {result.type === 'agent' ? (
          <AgentAvatar
            agentId={result.agent.agentId}
            avatar={result.agent.avatar}
            background={result.agent.backgroundColor || undefined}
            name={name}
            shape={'square'}
            size={AVATAR_SIZE}
          />
        ) : (
          <UserAvatar avatar={result.user.avatar} name={name} shape={'square'} size={AVATAR_SIZE} />
        )}
        <Flexbox gap={2} style={{ minWidth: 0 }}>
          <Text ellipsis fontSize={17} weight={500}>
            {name}
          </Text>
          {subtitle && (
            <Text ellipsis fontSize={13} type={'secondary'}>
              {subtitle}
            </Text>
          )}
        </Flexbox>
      </Flexbox>

      {(handle || description) && (
        <Flexbox gap={6} {...stylex.props(styles.section)}>
          {handle && <InfoRow label={t('contacts.info.handle')} value={`@${handle}`} />}
          {description && <InfoRow clamp label={t('contacts.info.bio')} value={description} />}
        </Flexbox>
      )}

      {typeof actions === 'string' ? (
        <div {...stylex.props(styles.note)}>{actions}</div>
      ) : (
        <div {...stylex.props(styles.actions)}>
          {actions.map((action) => (
            <Tile key={action.label} {...action} />
          ))}
        </div>
      )}
    </div>
  );
});

ResultCard.displayName = 'AddContactResultCard';

export default ResultCard;
