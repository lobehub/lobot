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
import {
  BookOpen,
  FileText,
  Folder,
  Laptop,
  type LucideIcon,
  Settings,
  SquareTerminal,
} from 'lucide-react';
import { Fragment, memo, type PropsWithChildren, type ReactNode, useState } from 'react';
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
import { AgentCardActions } from './AgentCardActions';
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
  footer: css`
    display: flex;
    flex-direction: column;
    gap: 8px;

    padding-block: 12px 16px;
    padding-inline: 16px;
    border-block-start: 1px solid ${cssVar.colorBorderSecondary};

    color: ${cssVar.colorTextSecondary};
  `,
  // Runtime, device and directory share one grid so the icons, the labels and the
  // values each sit on a single column, with the same gap between every row.
  meta: css`
    display: grid;
    grid-template-columns: 16px max-content minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  `,
  metaIcon: css`
    display: flex;
    justify-content: center;
  `,
  metaValue: css`
    min-width: 0;
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
  /** Channel-specific block under the profile, such as the conversations it is working in. */
  extra?: ReactNode;
  /** When set, enables group-specific actions (settings nav + model change). */
  groupId?: string;
  /**
   * Paint the trigger while the card is open. Off when the trigger already sits in a selected row.
   * @default true
   */
  highlightTrigger?: boolean;
  /** Tells the owner when a controlled popup opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Controlled open state. Omit it and the popup keeps its own. */
  open?: boolean;
  /** Overrides the default: above the trigger on hover, beside it on click. */
  placement?: 'left' | 'right' | 'top';
  trigger?: 'click' | 'hover';
}

const AgentProfilePopup = memo<AgentProfilePopupProps>(
  ({
    agent,
    agentId,
    environment,
    extra,
    groupId,
    highlightTrigger = true,
    children,
    onOpenChange,
    open: openProp,
    placement,
    trigger = 'click',
  }) => {
    const { t } = useTranslation('chat');
    const navigate = useWorkspaceAwareNavigate();
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = openProp ?? uncontrolledOpen;
    const setOpen = (next: boolean) => {
      onOpenChange?.(next);
      if (openProp === undefined) setUncontrolledOpen(next);
    };
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
    const contactAgent = useContactStore(contactSelectors.agentById(agentId));
    const contactUrl = listEntry || contactAgent ? CONTACT_URL(agentId) : undefined;

    const { detail: fetched, isLoading } = useAgentProfileDetail(agentId, open && !!canConfigure);

    const runtimeLabel = resolveAgentRuntimeLabel({
      fetchedType: fetched?.agencyConfig?.heterogeneousProvider?.type,
      listEntry,
    });
    const isExternal = !!runtimeLabel;

    const merged: Partial<AgentPreview> = {
      avatar: fetched?.avatar ?? agent?.avatar,
      // The contacts wall already has this banner. A channel card often arrives without it,
      // so fall through to the agent's own list entry and then to a shared contact.
      backgroundColor:
        fetched?.backgroundColor ??
        agent?.backgroundColor ??
        listEntry?.backgroundColor ??
        contactAgent?.agent.backgroundColor,
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

    const deviceName = environment?.deviceName;
    const directory = environment?.workingDirectory;
    // An external agent picks its own model inside its CLI, so the LobeHub model
    // on its config is not what runs it: name the runtime instead, and never
    // offer a model switch that would not take effect.
    const metaRow = (
      key: string,
      icon: LucideIcon,
      label: string,
      value: string,
      title?: string,
    ) => (
      <Fragment key={key}>
        <span className={styles.metaIcon}>
          <Icon icon={icon} size={14} />
        </span>
        <Text fontSize={12} type={'secondary'}>
          {label}
        </Text>
        <Text
          ellipsis
          className={styles.metaValue}
          fontSize={12}
          title={title ?? value}
          type={'secondary'}
        >
          {value}
        </Text>
      </Fragment>
    );
    const metaRows = [
      isExternal && runtimeLabel
        ? metaRow('runtime', SquareTerminal, t('agentProfile.runtimeLabel'), runtimeLabel)
        : null,
      deviceName ? metaRow('device', Laptop, t('agentProfile.deviceLabel'), deviceName) : null,
      directory
        ? metaRow(
            'directory',
            Folder,
            t('agentProfile.directoryLabel'),
            shortDirectory(directory),
            directory,
          )
        : null,
    ].filter(Boolean);
    const showModel = !isExternal && canConfigure && !!merged.model;
    const showChips = showModel || (canConfigure && hasStats);
    const showSkeletonChips = footerLoading && !isExternal;
    const facts =
      showSkeletonChips || showChips || metaRows.length > 0 ? (
        <div className={styles.footer}>
          {showSkeletonChips ? (
            <Flexbox horizontal align={'center'} gap={8}>
              <Skeleton height={16} width={90} />
              <Skeleton height={16} width={60} />
            </Flexbox>
          ) : (
            showChips && (
              <Flexbox horizontal align={'center'} gap={8} wrap={'wrap'}>
                {showModel && (
                  <Flexbox horizontal align={'center'} className={styles.statItem} gap={8}>
                    <ModelIcon model={merged.model ?? undefined} size={14} />
                    <Text fontSize={12} type={'secondary'}>
                      {merged.model}
                    </Text>
                  </Flexbox>
                )}
                {pluginCount > 0 && (
                  <Flexbox horizontal align={'center'} className={styles.statItem} gap={8}>
                    <Icon icon={SkillsIcon} size={14} />
                    <Text fontSize={12} type={'secondary'}>
                      {t('agentProfile.skills', { count: pluginCount })}
                    </Text>
                  </Flexbox>
                )}
                {knowledgeCount > 0 && (
                  <Flexbox horizontal align={'center'} className={styles.statItem} gap={8}>
                    <Icon icon={BookOpen} size={14} />
                    <Text fontSize={12} type={'secondary'}>
                      {t('agentProfile.knowledgeBases', { count: knowledgeCount })}
                    </Text>
                  </Flexbox>
                )}
                {fileCount > 0 && (
                  <Flexbox horizontal align={'center'} className={styles.statItem} gap={8}>
                    <Icon icon={FileText} size={14} />
                    <Text fontSize={12} type={'secondary'}>
                      {t('agentProfile.files', { count: fileCount })}
                    </Text>
                  </Flexbox>
                )}
              </Flexbox>
            )
          )}
          {metaRows.length > 0 && (
            <div className={styles.meta} data-testid={'agent-meta'}>
              {metaRows}
            </div>
          )}
        </div>
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
        {facts}
        {extra}
        {/* Only an Agent the server opens a conversation with: one's own, or a contact. */}
        {contactUrl && channelsEnabled && (
          <AgentCardActions
            agentId={agentId}
            profileUrl={contactUrl}
            onDone={() => setOpen(false)}
          />
        )}
      </AgentProfileCard>
    );

    return (
      <Popover
        {...cardPopoverProps}
        content={content}
        nativeButton={false}
        open={open}
        placement={placement ?? (trigger === 'hover' ? 'top' : 'right')}
        trigger={trigger}
        classNames={
          trigger === 'click' && highlightTrigger ? { trigger: styles.trigger } : undefined
        }
        onOpenChange={setOpen}
      >
        {children}
      </Popover>
    );
  },
);

export default AgentProfilePopup;
