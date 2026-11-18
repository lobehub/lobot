'use client';

import { CHANNEL_URL } from '@lobechat/const';
import {
  ActionIcon,
  type DropdownItem,
  DropdownMenu,
  Flexbox,
  Icon,
  type IconProps,
  SearchBar,
  Text,
} from '@lobehub/ui';
import { GroupBotSquareIcon } from '@lobehub/ui/icons';
import { BotIcon, CirclePlusIcon, FolderPlus, Hash } from 'lucide-react';
import { memo, type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openCreateChannel } from '@/features/Channels/CreateChannel';
import { useChannelSections } from '@/features/Channels/useChannelSections';
import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { useCreateMenuItems } from '@/features/HomeSidebar/hooks';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

import { useMessageSearch } from './SearchContext';

// The header's icon size with a thinner stroke, so the outlined "+" reads lighter beside the search box.
const CREATE_ICON_SIZE = { blockSize: 32, size: 20, strokeWidth: 1.5 };

/**
 * A WeChat-style "+" menu row: a line icon a step larger than a dense action menu's, at body
 * text size, so the menu stays small beside the list. The menu's own icon slot is fixed at
 * 14px, so the icon rides in the label instead.
 */
const createRow = (item: DropdownItem, icon: IconProps['icon'], label?: string): DropdownItem =>
  item && item.type !== 'group' && item.type !== 'divider'
    ? {
        ...item,
        icon: undefined,
        label: (
          <Flexbox horizontal align={'center'} gap={10}>
            <Icon icon={icon} size={18} />
            <span style={{ fontSize: 14 }}>{label ?? ('label' in item ? item.label : null)}</span>
          </Flexbox>
        ),
      }
    : item;

interface ListHeaderProps {
  actions?: ReactNode;
  title: string;
}

/** List column header: tab title on the left, column actions on the right. */
export const ListHeader = memo<ListHeaderProps>(({ title, actions }) => (
  <Flexbox
    horizontal
    align={'center'}
    gap={4}
    justify={'space-between'}
    paddingBlock={12}
    paddingInline={'14px 10px'}
  >
    <Text ellipsis fontSize={15} weight={600}>
      {title}
    </Text>
    <Flexbox horizontal align={'center'} gap={2}>
      {actions}
    </Flexbox>
  </Flexbox>
));

ListHeader.displayName = 'ListHeader';

const Header = memo(() => {
  const { t } = useTranslation(['common', 'channel']);
  const { query, setQuery } = useMessageSearch();
  const { createAgentMenuItem, createGroupChatMenuItem, isLoading } = useCreateMenuItems();
  const channelsEnabled = useChannelsEnabled();
  const navigate = useWorkspaceAwareNavigate();
  const { create: createSection, sections } = useChannelSections();
  // Only the two things a conversation is started with: an Agent (whose modal also connects
  // external ones) and a group. With Channels on, the group is a Channel, general or a project's.
  const createItems = useMemo(
    () => [
      createRow(createAgentMenuItem(), BotIcon),
      channelsEnabled
        ? createRow(
            {
              key: 'newChannel',
              onClick: () => openCreateChannel((id) => navigate(CHANNEL_URL(id))),
            },
            Hash,
            t('create', { ns: 'channel' }),
          )
        : // Worded the way WeChat's "+" menu starts one.
          createRow(createGroupChatMenuItem(), GroupBotSquareIcon, t('messageList.startGroupChat')),
      // The person's own sections of this list, once the server has them.
      ...(channelsEnabled && sections
        ? [
            { type: 'divider' as const },
            createRow(
              { key: 'newSection', onClick: () => createSection() },
              FolderPlus,
              t('section.create', { ns: 'channel' }),
            ),
          ]
        : []),
    ],
    [
      channelsEnabled,
      createAgentMenuItem,
      createGroupChatMenuItem,
      createSection,
      navigate,
      sections,
      t,
    ],
  );

  // WeChat-style header: a search box that filters the list, and one "+" entry.
  return (
    <Flexbox
      horizontal
      align={'center'}
      gap={6}
      paddingBlock={'12px 8px'}
      paddingInline={'10px 8px'}
    >
      <SearchBar
        allowClear
        placeholder={t('messageList.search')}
        // Shrinks below its input's natural width so the row fits a narrow column.
        style={{ flex: 1, minWidth: 0 }}
        value={query}
        variant={'filled'}
        onChange={(e) => setQuery(e.target.value)}
      />
      <DropdownMenu
        items={createItems}
        placement={'bottomRight'}
        popupProps={{ style: { minWidth: 136, padding: 4 } }}
      >
        <ActionIcon
          icon={CirclePlusIcon}
          loading={isLoading}
          size={CREATE_ICON_SIZE}
          // Keeps its square: the search box gives way in a narrow column, not this button.
          style={{ flex: 'none' }}
          title={t('messageList.newChat')}
        />
      </DropdownMenu>
    </Flexbox>
  );
});

Header.displayName = 'MessageListHeader';

export default Header;
