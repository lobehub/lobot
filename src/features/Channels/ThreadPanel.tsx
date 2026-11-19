import {
  ActionIcon,
  ContextMenuTrigger,
  cssVar,
  DropdownMenu,
  Flexbox,
  Icon,
  Text,
} from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { Maximize2, MoreHorizontal, X } from 'lucide-react';
import {
  Activity,
  type ComponentProps,
  type ReactElement,
  useDeferredValue,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import NavHeader from '@/features/NavHeader';
import RightPanel from '@/features/RightPanel';
import { channelSelectors, useChannelStore } from '@/store/channel';

import { ChannelConversation } from './ChannelConversation';
import { DraftThreadConversation } from './DraftThreadConversation';
import { headerHoverMarker } from './markers.stylex';
import { MemberAvatar } from './MemberAvatar';
import { memberName } from './memberName';
import { styles } from './styles';
import { type ChannelThreadDraft, draftThreadFollowerIds } from './threadDraft';
import { threadIcon } from './threadIcon';
import { threadTitle } from './threadTitle';
import { useThreadMenu } from './useThreadMenu';

/** Below this width the thread floats over the channel instead of sitting beside it. */
export const THREAD_FLOAT_BREAKPOINT = 760;

const MAX_FOLLOWER_AVATARS = 3;

export const ThreadFollowers = ({
  detail,
  target,
}: {
  detail: ChannelDetail;
  target: string | ChannelThreadDraft;
}) => {
  const { t } = useTranslation('channel');
  const { members = [], threads = [] } = detail;
  const followerIds =
    typeof target === 'string'
      ? (threads.find((entry) => entry.id === target)?.followerMemberIds ?? [])
      : draftThreadFollowerIds(target.root, members);
  const followers = members.filter(
    (member) => member.status === 'active' && followerIds.includes(member.id),
  );
  if (!followers.length) return null;
  const names = followers.map((member) => memberName(member, t('deletedMember'))).join('、');
  const overflow = followers.length - MAX_FOLLOWER_AVATARS;
  return (
    <Flexbox
      horizontal
      align="center"
      aria-label={t('followers', { names })}
      gap={4}
      role="img"
      title={t('followers', { names })}
    >
      {followers.slice(0, MAX_FOLLOWER_AVATARS).map((member) => (
        <MemberAvatar key={member.id} member={member} size={20} />
      ))}
      {overflow > 0 && (
        <Text fontSize={12} type="secondary">
          +{overflow}
        </Text>
      )}
    </Flexbox>
  );
};

export function ThreadPanel({
  availableWidth = 1000,
  detail,
  threadId,
  draft,
  onClose,
  onOpenPage,
  onSendDraft,
}: {
  availableWidth?: number;
  detail: ChannelDetail;
  draft: ChannelThreadDraft | null;
  onClose: () => void;
  onOpenPage: (threadId: string) => void;
  onSendDraft: ComponentProps<typeof DraftThreadConversation>['onSend'];
  threadId: string | null;
}) {
  const { t } = useTranslation('channel');
  const threadMenu = useThreadMenu();
  // Keep the last preview/conversation mounted while the panel animates closed.
  const target = threadId || draft;
  const [lastTarget, setLastTarget] = useState(target);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFor, setMenuFor] = useState(threadId);
  const [preferredWidth, setPreferredWidth] = useState(520);
  // Opening the menu belongs to one thread. Switching closes it on this render.
  if (menuFor !== threadId) {
    setMenuFor(threadId);
    setMenuOpen(false);
  }
  if (target && target !== lastTarget) setLastTarget(target);
  // The panel and its header open first; the conversation, the heavy part, mounts in a
  // background render right after, so the click is answered without waiting for it.
  const shownTarget = useDeferredValue(lastTarget);
  const narrow = availableWidth < THREAD_FLOAT_BREAKPOINT;
  const maxWidth = narrow ? availableWidth : availableWidth - 360;
  const width = Math.min(preferredWidth, maxWidth);
  const channelId = detail.channel?.id ?? '';
  const { messages = [], threads = [] } = detail;
  const lastThreadId = typeof lastTarget === 'string' ? lastTarget : null;
  // Same name as the sidebar entry: the Agent's title, or the first line of its root message.
  const threadView = useChannelStore(
    channelSelectors.detail({ channelId, threadId: lastThreadId }),
  );
  const rootMessageId = threads.find((entry) => entry.id === lastThreadId)?.rootMessageId;
  const openThread = threadId ? threads.find((entry) => entry.id === threadId) : undefined;
  // "Open as page" is its own header button, shown on hover; the menu keeps the thread's actions.
  const menuItems = openThread ? threadMenu(detail.channel, openThread) : [];
  const withMenu = (node: ReactElement) =>
    menuItems.length > 0 ? <ContextMenuTrigger items={menuItems}>{node}</ContextMenuTrigger> : node;
  const title =
    threadTitle(
      (lastTarget && typeof lastTarget !== 'string' ? lastTarget.root : threadView?.rootMessage) ??
        messages.find((message) => message.id === rootMessageId),
      threads.find((entry) => entry.id === lastThreadId),
    ) || t('thread');

  return (
    <RightPanel
      className={stylex.props(styles.threadPanel).className}
      classNames={{ content: stylex.props(styles.threadContent).className }}
      expand={!!target}
      maxWidth={maxWidth}
      minWidth={Math.min(360, maxWidth)}
      mode={narrow ? 'float' : 'fixed'}
      showHandleWhenCollapsed={false}
      showHandleWideArea={false}
      width={narrow ? availableWidth : width}
      onExpandChange={(expand) => {
        if (!expand) onClose();
      }}
      onSizeChange={(size) => {
        const next = Number.parseFloat(String(size?.width));
        if (Number.isFinite(next)) setPreferredWidth(next);
      }}
    >
      <Activity mode={target ? 'visible' : 'hidden'}>
        <Flexbox aria-label={t('thread')} role="region" {...stylex.props(styles.body)}>
          <NavHeader
            // The marker reveals the title's "more" button while this bar is hovered or focused.
            {...stylex.props(headerHoverMarker, styles.threadHeader)}
            paddingBlock={6}
            paddingInline={8}
            showTogglePanelButton={false}
            left={
              <Flexbox
                horizontal
                align="center"
                gap={8}
                style={{ marginInlineStart: 4, minWidth: 0 }}
              >
                {withMenu(<Icon color={cssVar.colorTextDescription} icon={threadIcon} size={18} />)}
                {withMenu(
                  <Text ellipsis fontSize={14} title={title}>
                    {title}
                  </Text>,
                )}
                {menuItems.length > 0 && (
                  <span
                    data-menu-open={menuOpen ? '' : undefined}
                    {...stylex.props(styles.headerMenu)}
                  >
                    <DropdownMenu items={menuItems} onOpenChange={setMenuOpen}>
                      <ActionIcon
                        aria-label={t('more', { ns: 'common' })}
                        icon={MoreHorizontal}
                        size="small"
                        title={t('more', { ns: 'common' })}
                      />
                    </DropdownMenu>
                  </span>
                )}
              </Flexbox>
            }
            right={
              <Flexbox horizontal align="center" gap={8}>
                {/* Leftmost in the right-aligned group, so revealing it shifts nothing. */}
                {threadId && (
                  <span {...stylex.props(styles.headerMenu)}>
                    <ActionIcon
                      aria-label={t('openThreadPage')}
                      icon={Maximize2}
                      size="small"
                      title={t('openThreadPage')}
                      onClick={() => onOpenPage(threadId)}
                    />
                  </span>
                )}
                {lastTarget && <ThreadFollowers detail={detail} target={lastTarget} />}
                <ActionIcon
                  aria-label={t('closeThread')}
                  icon={X}
                  size="small"
                  title={t('closeThread')}
                  onClick={onClose}
                />
              </Flexbox>
            }
          />
          {typeof shownTarget === 'string' ? (
            <ChannelConversation
              channelId={detail.channel.id}
              key={shownTarget}
              threadId={shownTarget}
            />
          ) : shownTarget ? (
            <DraftThreadConversation
              detail={detail}
              draft={shownTarget}
              key={shownTarget.root.id}
              onSend={onSendDraft}
            />
          ) : null}
        </Flexbox>
      </Activity>
    </RightPanel>
  );
}
