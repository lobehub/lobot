import type { DropdownItem } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import { Bot, CircleUserRound, FolderCog, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { channelSelectors, useChannelStore } from '@/store/channel';

import { openChannelAgentEnvironment } from './AgentEnvironment';
import { flattenChannelMenu } from './flattenChannelMenu';
import { useMemberEntries } from './MemberList';
import { useOpenChannelSettings } from './Settings/tabs';
import { useChannelMenu } from './useChannelMenu';
import { useOpenDirectAgent } from './useOpenDirectAgent';

/**
 * Channel actions a direct conversation keeps. It is the chat with one Agent, so it cannot be
 * renamed, archived or trashed; `unarchive` only frees one that was archived earlier.
 */
const DIRECT_MENU_KEYS = new Set(['copyId', 'unarchive']);

/**
 * The items the Channel header's "…" menu and a right-click on its title share: a direct
 * conversation's Agent actions, a group's settings, or a private chat's existing actions.
 */
export const useChannelHeaderMenuItems = (
  detail: ChannelDetail,
  onToggleAgentPanel?: () => void,
): DropdownItem[] => {
  const { t } = useTranslation(['channel', 'channelHeader']);
  const openSettings = useOpenChannelSettings();
  const { channel } = detail;
  const entries = useMemberEntries(detail);
  const directAgent = channel.agentId
    ? entries.find((entry) => entry.member.agentId === channel.agentId)
    : undefined;
  const openAgent = useOpenDirectAgent(channel.id, channel.agentId ?? '');
  const channelMenu = useChannelMenu();
  const direct = !!channel.agentId;
  // Only the list row marks a conversation with another person's shared Agent, so the loaded
  // detail borrows that mark. Its owner runs and configures it: this viewer can read its profile,
  // not change its settings or where it runs.
  const listedShared = useChannelStore(channelSelectors.listed(channel.id))?.sharedAgent;
  const shared = !!(channel.sharedAgent || listedShared);

  if (direct) {
    return [
      ...(directAgent
        ? [
            ...(openAgent
              ? [
                  {
                    icon: Bot,
                    key: 'openAgent',
                    label: t('openAgentNamed', { name: directAgent.name }),
                    onClick: () => openAgent(),
                  },
                ]
              : []),
            // The member list is hidden here, so its device and directory setup lives in this menu.
            ...(!shared &&
            directAgent.member.status === 'active' &&
            channel.canDelete &&
            channel.status !== 'archived'
              ? [
                  {
                    icon: FolderCog,
                    key: 'environment',
                    label: t('environment.title'),
                    onClick: () => openChannelAgentEnvironment(channel.id, directAgent.member),
                  },
                ]
              : []),
            { type: 'divider' as const },
          ]
        : []),
      // Keyed items only: the menu's own dividers separate actions a direct conversation does not have.
      ...flattenChannelMenu(channelMenu(channel)).filter(
        (item) => !!item && 'key' in item && DIRECT_MENU_KEYS.has(String(item.key)),
      ),
      ...(onToggleAgentPanel
        ? [
            { type: 'divider' as const },
            {
              icon: shared ? CircleUserRound : Settings,
              key: 'agentSettings',
              label: shared ? t('profile.title') : t('agentSettings', { ns: 'channelHeader' }),
              onClick: onToggleAgentPanel,
            },
          ]
        : []),
    ];
  }

  // A conversation between two people has no settings to manage, only the private chat's actions.
  if (channel.peerUserId) return channelMenu(channel);

  // Managing a group lives in its settings panel; deleting it is not one click from the header.
  return [
    ...flattenChannelMenu(channelMenu(channel)).filter(
      (item) => !!item && 'key' in item && item.key === 'copyId',
    ),
    ...(channel.canDelete
      ? [
          { type: 'divider' as const },
          {
            icon: Settings,
            key: 'settings',
            label: t('settings.title'),
            onClick: () => openSettings(),
          },
        ]
      : []),
  ];
};

export const hasChannelHeaderMenuActions = (items: DropdownItem[]) =>
  items.some((item) => !!item && 'key' in item && item.key != null);
