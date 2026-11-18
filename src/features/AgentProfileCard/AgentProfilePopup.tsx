'use client';

import {
  ActionIcon,
  createStaticStyles,
  Flexbox,
  Icon,
  Popover,
  Skeleton,
  Text,
} from '@lobehub/ui';
import { SkillsIcon } from '@lobehub/ui/icons';
import { agentDisplayName, type ChannelMemberEnvironmentPreview } from '@lobot/types';
import { BookOpen, FileText, Folder, Laptop, Settings, SquareTerminal } from 'lucide-react';
import { memo, type PropsWithChildren, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ModelIcon } from '@/components/LobeIcons';
import { ArticleSkeleton } from '@/components/Skeleton';
import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { CONTACT_URL } from '@/features/ContactList/const';
import { useResourceAccess } from '@/features/ResourcePermission/useResourceAccess';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { usePermission } from '@/hooks/usePermission';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';
import { cardPopoverProps } from '@/styles/cardPopover';

import AgentProfileCard from '.';
import { resolveAgentRuntimeLabel } from './runtime';
import {
  type AgentProfilePreview as AgentPreview,
  useAgentProfileDetail,
} from './useAgentProfileDetail';

/** The last two segments of a path, so a deep directory stays readable on one line. */
const shortDirectory = (path: string) => {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : path;
};

const styles = createStaticStyles(({ css, cssVar }) => ({
  environment: css`
    padding-block-end: 12px;
    padding-inline: 16px;
  `,
  footer: css`
    padding-block: 12px;
    padding-inline: 16px;
    border-block-start: 1px solid ${cssVar.colorBorderSecondary};
  `,
  statItem: css`
    color: ${cssVar.colorTextSecondary};
  `,
  trigger: css`
    border-radius: ${cssVar.borderRadius};

    &[data-popup-open] {
      background: ${cssVar.colorFillTertiary};
    }
  `,
}));

interface AgentProfilePopupProps extends PropsWithChildren {
  /** Prefilled data for instant render; fetched data overrides once loaded. */
  agent?: Partial<AgentPreview>;
  agentId: string;
  /** Where the Agent runs in the Channel the card is opened from. */
  environment?: ChannelMemberEnvironmentPreview | null;
  /** When set, enables group-specific actions (settings nav + model change). */
  groupId?: string;
  /** Overrides the default: above the trigger on hover, beside it on click. */
  placement?: 'left' | 'right' | 'top';
  trigger?: 'click' | 'hover';
}

const AgentProfilePopup = memo<AgentProfilePopupProps>(
  ({ agent, agentId, environment, groupId, children, placement, trigger = 'click' }) => {
    const { t } = useTranslation('chat');
    const navigate = useWorkspaceAwareNavigate();
    const [open, setOpen] = useState(false);
    const { allowed: canEditContent } = usePermission('edit_own_content');
    const { canEditResource: canEditAgent, isAccessResolved: isAgentAccessResolved } =
      useResourceAccess('agent', open ? agentId : undefined);
    const { canEditResource: canEditGroup, isAccessResolved: isGroupAccessResolved } =
      useResourceAccess('agentGroup', open ? groupId : undefined);
    const canConfigure =
      canEditContent &&
      isAgentAccessResolved &&
      canEditAgent &&
      (!groupId || (isGroupAccessResolved && canEditGroup));

    const listEntry = useHomeStore(homeAgentListSelectors.getAgentById(agentId));
    // Contacts load with the Contacts tab; fetch them here too, so a shared Agent's card links to
    // its contact page before that tab was ever opened.
    const channelsEnabled = useChannelsEnabled();
    contactActions.useFetchList(open && channelsEnabled);
    // An Agent in my Contacts, mine or one shared with me, opens its contact card.
    const isContact = useContactStore((s) => !!contactSelectors.agentById(agentId)(s));
    const contactUrl = listEntry || isContact ? CONTACT_URL(agentId) : undefined;

    const { detail: fetched, isLoading } = useAgentProfileDetail(agentId, open && !!canConfigure);

    const runtimeLabel = resolveAgentRuntimeLabel({
      fetchedType: fetched?.agencyConfig?.heterogeneousProvider?.type,
      listEntry,
    });
    const isExternal = !!runtimeLabel;

    const merged: Partial<AgentPreview> = {
      avatar: fetched?.avatar ?? agent?.avatar,
      backgroundColor: fetched?.backgroundColor ?? agent?.backgroundColor,
      description: fetched?.description ?? agent?.description,
      model: fetched?.model ?? agent?.model,
      name: fetched?.name ?? agent?.name,
      provider: fetched?.provider ?? agent?.provider,
      title: fetched?.title ?? agent?.title,
    };

    const handleSettings = () => {
      if (!groupId || !canConfigure) return;
      if (!canConfigure) return;
      setOpen(false);
      navigate(`/group/${groupId}/profile?tab=${agentId}`);
    };

    const handleHeaderClick = () => {
      setOpen(false);
      navigate(contactUrl ?? `/agent/${agentId}/profile`);
    };

    const hasDisplay = Boolean(agentDisplayName(merged) || merged.avatar || merged.description);
    const showSkeleton = !hasDisplay && isLoading;

    const pluginCount = fetched?.plugins?.length ?? 0;
    const knowledgeCount = fetched?.knowledgeBases?.length ?? 0;
    const fileCount = fetched?.files?.length ?? 0;
    const hasStats = pluginCount > 0 || knowledgeCount > 0 || fileCount > 0;

    const footerLoading = canConfigure && !groupId && isLoading && !fetched;

    // An external agent picks its own model inside its CLI, so the LobeHub model
    // on its config is not what runs it: name the runtime instead, and never
    // offer a model switch that would not take effect.
    const modelSection =
      footerLoading && !isExternal ? (
        <Flexbox horizontal align={'center'} className={styles.footer} gap={14}>
          <Skeleton height={16} width={90} />
          <Skeleton height={16} width={60} />
        </Flexbox>
      ) : isExternal || (canConfigure && (merged.model || hasStats)) ? (
        <Flexbox horizontal align={'center'} className={styles.footer} gap={14} wrap={'wrap'}>
          {isExternal ? (
            <Flexbox horizontal align={'center'} className={styles.statItem} gap={6}>
              <Icon icon={SquareTerminal} size={14} />
              <Text fontSize={12} type={'secondary'}>
                {t('agentProfile.runtime', { name: runtimeLabel })}
              </Text>
            </Flexbox>
          ) : (
            merged.model && (
              <Flexbox horizontal align={'center'} className={styles.statItem} gap={6}>
                <ModelIcon model={merged.model} size={14} />
                <Text fontSize={12} type={'secondary'}>
                  {merged.model}
                </Text>
              </Flexbox>
            )
          )}
          {canConfigure && pluginCount > 0 && (
            <Flexbox horizontal align={'center'} className={styles.statItem} gap={4}>
              <Icon icon={SkillsIcon} size={13} />
              <Text fontSize={12} type={'secondary'}>
                {t('agentProfile.skills', { count: pluginCount })}
              </Text>
            </Flexbox>
          )}
          {canConfigure && knowledgeCount > 0 && (
            <Flexbox horizontal align={'center'} className={styles.statItem} gap={4}>
              <Icon icon={BookOpen} size={13} />
              <Text fontSize={12} type={'secondary'}>
                {t('agentProfile.knowledgeBases', { count: knowledgeCount })}
              </Text>
            </Flexbox>
          )}
          {canConfigure && fileCount > 0 && (
            <Flexbox horizontal align={'center'} className={styles.statItem} gap={4}>
              <Icon icon={FileText} size={13} />
              <Text fontSize={12} type={'secondary'}>
                {t('agentProfile.files', { count: fileCount })}
              </Text>
            </Flexbox>
          )}
        </Flexbox>
      ) : null;

    const deviceName = environment?.deviceName;
    const directory = environment?.workingDirectory;
    // Sits under the runtime line when there is one, else opens its own footer.
    const environmentSection =
      deviceName || directory ? (
        <Flexbox className={modelSection ? styles.environment : styles.footer} gap={6}>
          {deviceName && (
            <Flexbox horizontal align={'center'} className={styles.statItem} gap={6}>
              <Icon icon={Laptop} size={14} />
              <Text ellipsis fontSize={12} type={'secondary'}>
                {t('agentProfile.channelDevice', { name: deviceName })}
              </Text>
            </Flexbox>
          )}
          {directory && (
            <Flexbox
              horizontal
              align={'center'}
              className={styles.statItem}
              gap={6}
              title={directory}
            >
              <Icon icon={Folder} size={14} />
              <Text ellipsis fontSize={12} type={'secondary'}>
                {t('agentProfile.channelDirectory', { path: shortDirectory(directory) })}
              </Text>
            </Flexbox>
          )}
        </Flexbox>
      ) : null;

    const content = showSkeleton ? (
      <div style={{ padding: 16, width: 280 }}>
        <ArticleSkeleton avatar rows={2} />
      </div>
    ) : (
      <AgentProfileCard
        agentId={agentId}
        avatar={merged.avatar}
        backgroundColor={merged.backgroundColor}
        description={merged.description}
        loading={isLoading && !merged.description}
        title={agentDisplayName(merged, t('defaultSession', { ns: 'common' }))}
        headerAction={
          groupId && canConfigure ? (
            <Flexbox horizontal align="center" justify="flex-end" style={{ paddingBlockStart: 0 }}>
              <ActionIcon
                icon={Settings}
                size="small"
                title={t('groupSidebar.agentProfile.settings')}
                onClick={handleSettings}
              />
            </Flexbox>
          ) : undefined
        }
        onHeaderClick={contactUrl || canConfigure ? handleHeaderClick : undefined}
      >
        {modelSection}
        {environmentSection}
      </AgentProfileCard>
    );

    return (
      <Popover
        {...cardPopoverProps}
        classNames={trigger === 'click' ? { trigger: styles.trigger } : undefined}
        content={content}
        nativeButton={false}
        open={open}
        placement={placement ?? (trigger === 'hover' ? 'top' : 'right')}
        trigger={trigger}
        onOpenChange={setOpen}
      >
        {children}
      </Popover>
    );
  },
);

export default AgentProfilePopup;
