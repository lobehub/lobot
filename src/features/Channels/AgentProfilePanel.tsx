import { ActionIcon, Flexbox, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelPublicMember } from '@lobot/types';
import { agentSecondaryDisplayName } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { SquareArrowOutUpRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AgentPresenceDot, AgentPresenceLabel } from '@/features/ContactList/AgentPresenceBadge';
import { useAgentPresence } from '@/features/ContactList/useAgentPresence';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { channelSelectors, useChannelStore } from '@/store/channel';

import { AgentProfileEnvironment } from './AgentProfileEnvironment';
import { AgentSchedules } from './AgentSchedules';
import { MemberAvatar } from './MemberAvatar';
import { memberName } from './memberName';
import { ChannelSidePanel } from './MemberPanel';
import { SharedAgentOwner, useSharedAgentOwner } from './SharedAgentOwner';
import { useOpenDirectAgent } from './useOpenDirectAgent';

const styles = stylex.create({
  avatar: {
    position: 'relative',
    display: 'inline-flex',
  },
  description: {
    fontSize: '13px',
    lineHeight: '20px',
    color: cssVar.colorTextSecondary,
    whiteSpace: 'pre-wrap',
  },
  detail: {
    paddingBlock: '16px',
    paddingInline: '16px',
    borderBlockStartWidth: '1px',
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: cssVar.colorBorderSecondary,
  },
  hero: {
    paddingBlockStart: '28px',
    paddingBlockEnd: '16px',
    paddingInline: '40px',
    textAlign: 'center',
  },
  label: {
    fontSize: '12px',
    color: cssVar.colorTextTertiary,
  },
  placeholder: {
    fontSize: '13px',
    color: cssVar.colorTextQuaternary,
  },
  role: {
    overflow: 'hidden',
    fontSize: '12px',
    lineHeight: '18px',
    color: cssVar.colorTextTertiary,
    maxWidth: '100%',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

/** A direct conversation's side panel: the Agent's contact card, like an IM profile. */
export function AgentProfilePanel({
  agentId,
  availableWidth,
  channelId,
  id,
  manageable,
  member,
  onClose,
}: {
  agentId: string;
  availableWidth?: number;
  channelId: string;
  id: string;
  /** The viewer may change where the Agent runs in this conversation. */
  manageable?: boolean;
  member: ChannelPublicMember;
  onClose: () => void;
}) {
  const { t } = useTranslation('channel');
  const openAgent = useOpenDirectAgent(channelId, agentId);
  const useHydrateAgentConfig = useAgentStore((s) => s.useHydrateAgentConfig);
  // A Channel has no active Agent, so nothing else loads this one's config.
  useHydrateAgentConfig(true, agentId);
  const meta = useAgentStore(agentSelectors.getAgentMetaById(agentId));
  const slug = useAgentStore(agentSelectors.getAgentSlugById(agentId));
  const owner = useSharedAgentOwner(channelId, agentId);
  const presence = useAgentPresence(agentId);
  // A shared Agent's schedules are its owner's to run, not this viewer's.
  const shared = useChannelStore(
    (s) => !!channelSelectors.list(s)?.find((channel) => channel.id === channelId)?.sharedAgent,
  );
  const name = memberName(member, t('deletedMember'));
  const roleLine = [agentSecondaryDisplayName(meta), slug ? `@${slug}` : undefined]
    .filter(Boolean)
    .join(' · ');

  return (
    <ChannelSidePanel
      availableWidth={availableWidth}
      closeLabel={t('profile.hide')}
      id={id}
      label={t('profile.title')}
      title={t('profile.title')}
      actions={
        openAgent && (
          <ActionIcon
            aria-label={t('profile.view')}
            icon={SquareArrowOutUpRightIcon}
            size="small"
            title={t('profile.view')}
            onClick={() => openAgent('/profile')}
          />
        )
      }
      onClose={onClose}
    >
      <Flexbox style={{ minHeight: 0, overflowY: 'auto' }}>
        <Flexbox align="center" gap={6} {...stylex.props(styles.hero)}>
          <span {...stylex.props(styles.avatar)}>
            <MemberAvatar member={member} size={64} />
            {presence && <AgentPresenceDot presence={presence} size="small" />}
          </span>
          <Text ellipsis fontSize={17} style={{ maxWidth: '100%' }} weight={600}>
            {name}
          </Text>
          {roleLine && <span {...stylex.props(styles.role)}>{roleLine}</span>}
          {presence && <AgentPresenceLabel presence={presence} />}
        </Flexbox>
        <Flexbox gap={20} {...stylex.props(styles.detail)}>
          {owner && (
            <Flexbox gap={6}>
              <span {...stylex.props(styles.label)}>{t('profile.owner')}</span>
              <SharedAgentOwner owner={owner} />
            </Flexbox>
          )}
          <Flexbox gap={6}>
            <span {...stylex.props(styles.label)}>{t('profile.about')}</span>
            {member.description ? (
              <span {...stylex.props(styles.description)}>{member.description}</span>
            ) : (
              <span {...stylex.props(styles.placeholder)}>{t('profile.noDescription')}</span>
            )}
          </Flexbox>
          {!shared && (
            <AgentProfileEnvironment
              agentId={agentId}
              channelId={channelId}
              manageable={manageable}
              member={member}
            />
          )}
          {!shared && <AgentSchedules agentId={agentId} />}
        </Flexbox>
      </Flexbox>
    </ChannelSidePanel>
  );
}
