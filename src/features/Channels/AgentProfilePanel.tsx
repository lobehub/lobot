import { ActionIcon, Flexbox, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelPublicMember } from '@lobot/types';
import { agentSecondaryDisplayName } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { PencilLineIcon, SquareArrowOutUpRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { createAgentIdentityModal } from '@/features/AgentIdentityModal';
import { AgentPresenceLabel } from '@/features/ContactList/AgentPresenceBadge';
import { useAgentPresence } from '@/features/ContactList/useAgentPresence';
import { useResourceAccess } from '@/features/ResourcePermission/useResourceAccess';
import { usePermission } from '@/hooks/usePermission';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';

import { AgentProfileEnvironment } from './AgentProfileEnvironment';
import { AgentSchedules } from './AgentSchedules';
import { MemberAvatar } from './MemberAvatar';
import { memberName } from './memberName';
import { ChannelSidePanel } from './MemberPanel';
import { SharedAgentOwner, useSharedAgentOwner } from './SharedAgentOwner';
import { useOpenDirectAgent } from './useOpenDirectAgent';

const styles = stylex.create({
  description: {
    fontSize: '13px',
    lineHeight: '20px',
    color: cssVar.colorTextSecondary,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  addDescription: {
    alignSelf: 'flex-start',
    padding: 0,
    borderWidth: 0,
    font: 'inherit',
    fontSize: '13px',
    lineHeight: '20px',
    color: { 'default': cssVar.colorTextTertiary, ':hover': cssVar.colorText },
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  detail: {
    paddingBlock: '16px',
    paddingInline: '16px',
  },
  hero: {
    paddingBlockStart: '16px',
    paddingBlockEnd: '8px',
    paddingInline: '16px',
    textAlign: 'center',
  },
  label: {
    fontSize: '13px',
    color: cssVar.colorTextSecondary,
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
  const { allowed: canEditContent } = usePermission('edit_own_content');
  const { canEditResource } = useResourceAccess('agent', shared ? undefined : agentId);
  // Only who may edit the Agent changes who it is; a shared one stays its owner's.
  const editable = !shared && member.status === 'active' && !!canEditContent && canEditResource;
  const name = memberName(member, t('deletedMember'));
  const description = member.description?.trim();
  const edit = () =>
    createAgentIdentityModal(agentId, {
      // The conversation shows the Agent as its member, so its name, avatar and about refresh too.
      onSaved: () => {
        void channelActions.refreshDetail({ channelId });
        void channelActions.refreshList();
      },
    });
  const roleLine = [agentSecondaryDisplayName(meta), slug ? `@${slug}` : undefined]
    .filter(Boolean)
    .join(' · ');

  return (
    <ChannelSidePanel
      availableWidth={availableWidth}
      closeLabel={t('profile.hide')}
      id={id}
      label={t('profile.title')}
      actions={
        <>
          {editable && (
            <ActionIcon
              aria-label={t('profile.edit')}
              icon={PencilLineIcon}
              size="small"
              title={t('profile.edit')}
              onClick={edit}
            />
          )}
          {openAgent && (
            <ActionIcon
              aria-label={t('profile.view')}
              icon={SquareArrowOutUpRightIcon}
              size="small"
              title={t('profile.view')}
              onClick={() => openAgent('/profile')}
            />
          )}
        </>
      }
      onClose={onClose}
    >
      <Flexbox style={{ minHeight: 0, overflowY: 'auto' }}>
        <Flexbox align="center" gap={6} {...stylex.props(styles.hero)}>
          <MemberAvatar member={member} size={64} />
          <Text ellipsis fontSize={17} style={{ maxWidth: '100%' }} weight={600}>
            {name}
          </Text>
          {roleLine && <span {...stylex.props(styles.role)}>{roleLine}</span>}
          {presence && <AgentPresenceLabel presence={presence} />}
        </Flexbox>
        <Flexbox gap={24} {...stylex.props(styles.detail)}>
          {owner && (
            <Flexbox gap={6}>
              <span {...stylex.props(styles.label)}>{t('profile.owner')}</span>
              <SharedAgentOwner owner={owner} />
            </Flexbox>
          )}
          {(description || editable) && (
            <Flexbox gap={8}>
              <span {...stylex.props(styles.label)}>{t('profile.about')}</span>
              {description ? (
                <span {...stylex.props(styles.description)}>{member.description}</span>
              ) : (
                // Nothing written yet: the empty line is where its owner starts writing one.
                <button type="button" {...stylex.props(styles.addDescription)} onClick={edit}>
                  {t('profile.addDescription')}
                </button>
              )}
            </Flexbox>
          )}
          {!shared && <AgentSchedules agentId={agentId} />}
          {!shared && (
            <AgentProfileEnvironment
              agentId={agentId}
              channelId={channelId}
              manageable={manageable}
              member={member}
            />
          )}
        </Flexbox>
      </Flexbox>
    </ChannelSidePanel>
  );
}
