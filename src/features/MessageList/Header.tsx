'use client';

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
import * as stylex from '@stylexjs/stylex';
import { BotIcon, Hash, PlusIcon, SearchIcon, UserPlus } from 'lucide-react';
import { type FocusEvent, memo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useHasActiveWorkspace } from '@/business/client/hooks/useHasActiveWorkspace';

import { useMessageSearch } from './SearchContext';
import { COLUMN_ACTION_ICON_SIZE, styles } from './style';
import { useCreateActions } from './useCreateActions';

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
  const { t } = useTranslation('common');
  const { query, setQuery } = useMessageSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const closeSearch = () => {
    setQuery('');
    setSearchOpen(false);
  };
  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.querySelector('input')?.focus();
  }, [searchOpen]);
  const onSearchBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    if (!query) setSearchOpen(false);
  };
  const { addFriend, createAgent, createGroupChat, isLoading } = useCreateActions();
  const inWorkspace = useHasActiveWorkspace();
  // What a conversation starts from, the same three as the desktop app menu. The group chat is a
  // Channel, general or a project's. Friends belong to the personal space, so a workspace has no
  // add-friend entry.
  const createItems = useMemo(
    () => [
      createRow({ key: 'newAgent', onClick: createAgent }, BotIcon, t('messageList.newAgent')),
      createRow(
        { key: 'newChannel', onClick: createGroupChat },
        Hash,
        t('messageList.newGroupChat'),
      ),
      ...(inWorkspace
        ? []
        : [
            createRow(
              { key: 'addFriend', onClick: addFriend },
              UserPlus,
              t('messageList.addFriend'),
            ),
          ]),
    ],
    [addFriend, createAgent, createGroupChat, inWorkspace, t],
  );

  // Both sit on the right, the same circle as the contacts button. Search stays an icon
  // until it is opened, then the field takes the rest of the row.
  return (
    <Flexbox
      horizontal
      align={'center'}
      gap={8}
      justify={'flex-end'}
      paddingBlock={'12px 8px'}
      paddingInline={14}
    >
      {searchOpen ? (
        <div
          ref={searchRef}
          style={{ flex: 1, minWidth: 0 }}
          onBlur={onSearchBlur}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            closeSearch();
          }}
        >
          <SearchBar
            allowClear
            placeholder={t('messageList.search')}
            style={{ width: '100%' }}
            value={query}
            variant={'filled'}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      ) : (
        <ActionIcon
          aria-label={t('messageList.search')}
          icon={SearchIcon}
          size={COLUMN_ACTION_ICON_SIZE}
          title={t('messageList.search')}
          variant={'outlined'}
          {...stylex.props(styles.columnActionIcon)}
          onClick={() => setSearchOpen(true)}
        />
      )}
      <DropdownMenu
        items={createItems}
        placement={'bottomRight'}
        popupProps={{ style: { minWidth: 136, padding: 4 } }}
      >
        <ActionIcon
          aria-label={t('messageList.newChat')}
          icon={PlusIcon}
          loading={isLoading}
          size={COLUMN_ACTION_ICON_SIZE}
          title={t('messageList.newChat')}
          variant={'outlined'}
          {...stylex.props(styles.columnActionIcon)}
        />
      </DropdownMenu>
    </Flexbox>
  );
});

Header.displayName = 'MessageListHeader';

export default Header;
