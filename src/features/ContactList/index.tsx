'use client';

import { agentDisplayName, type SidebarAgentItem } from '@lobechat/types';
import {
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionRoot,
  accordionStyles,
  AccordionTrigger,
  ActionIcon,
  cx,
  DropdownMenu,
  Flexbox,
  Icon,
  Text,
} from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import isEqual from 'fast-deep-equal';
import { ArrowDownUpIcon, Pin, PinOff, UserRoundPlusIcon, UserRoundSearchIcon } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import AsyncError from '@/components/AsyncError';
import { DESKTOP_HEADER_ICON_SMALL_SIZE } from '@/const/layoutTokens';
import { openAddContactModal } from '@/features/AddContactModal';
import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { AgentModalProvider } from '@/features/HomeSidebar/Body/Agent/ModalProvider';
import { useCreateMenuItems } from '@/features/HomeSidebar/hooks';
import { AVATAR_SIZE, ConversationRow, ListHeader } from '@/features/MessageList';
import SkeletonList from '@/features/NavPanel/components/SkeletonList';
import { NavPanelPortal } from '@/features/NavPanel/NavPanelPortal';
import { NAV_PANEL_CONTACTS_KEY } from '@/features/NavPanel/railRouteKey';
import SideBarLayout from '@/features/NavPanel/SideBarLayout';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { useFetchAgentList } from '@/hooks/useFetchAgentList';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';

import { CONTACT_URL } from './const';
import ContactAvatar from './ContactAvatar';
import { PersonRow, RequestRow, SharedAgentRow } from './ExternalRows';
import { CONTACT_SORT_BYS, groupContacts } from './sortContacts';
import { styles } from './style';

const useActiveRouteId = () => {
  const { pathname } = useActiveLocation();
  const slug = useActiveWorkspaceSlug();
  const segments = pathname.split('/').filter(Boolean);
  const [root, id, personId] = slug && segments[0] === slug ? segments.slice(1) : segments;
  // A person's card lives under `/agents/people/:userId`.
  if (root === 'agents' && id === 'people') return personId;

  return root === 'agents' || root === 'agent' || root === 'group' ? id : undefined;
};

const Contact = memo<{ active: boolean; item: SidebarAgentItem }>(({ active, item }) => {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const [pinAgent, pinAgentGroup] = useHomeStore((s) => [s.pinAgent, s.pinAgentGroup]);
  const pinned = !!item.pinned;
  const title =
    item.type === 'group'
      ? item.title || t('untitledAgent')
      : agentDisplayName(item, t('untitledAgent'));

  return (
    <ConversationRow
      singleLine
      active={active}
      avatar={<ContactAvatar item={item} name={title} size={AVATAR_SIZE} />}
      title={title}
      url={CONTACT_URL(item.id)}
      contextMenuItems={() => [
        {
          icon: <Icon icon={pinned ? PinOff : Pin} />,
          key: 'pin',
          label: tCommon(pinned ? 'pinOff' : 'pin'),
          onClick: () =>
            item.type === 'group' ? pinAgentGroup(item.id, !pinned) : pinAgent(item.id, !pinned),
        },
      ]}
    />
  );
});

Contact.displayName = 'Contact';

const Body = memo(() => {
  const { t } = useTranslation('common');
  const { t: tChat } = useTranslation('chat');
  const { error, mutate } = useFetchAgentList();
  const isInit = useHomeStore(homeAgentListSelectors.isAgentListInit);
  const items = useHomeStore(homeAgentListSelectors.allAgents, isEqual);
  const activeRouteId = useActiveRouteId();
  const sortBy = useGlobalStore(systemStatusSelectors.contactListSortBy);
  // People and other people's Agents belong to the Channel experience.
  const channelsEnabled = useChannelsEnabled();
  contactActions.useFetchList(channelsEnabled);
  contactActions.useFetchRequests(channelsEnabled);
  const people = useContactStore((s) => contactSelectors.people(s) ?? [], isEqual);
  const sharedAgents = useContactStore((s) => contactSelectors.agents(s) ?? [], isEqual);
  const requests = useContactStore(contactSelectors.incomingRequests, isEqual);
  const updateSystemStatus = useGlobalStore((s) => s.updateSystemStatus);

  const { agents, groups, pinned } = useMemo(
    () =>
      groupContacts(
        [...new Map(items.map((item) => [item.id, item])).values()],
        sortBy,
        tChat('untitledAgent'),
      ),
    [items, sortBy, tChat],
  );

  const sortMenuItems = CONTACT_SORT_BYS.map((by) => ({
    checked: sortBy === by,
    key: by,
    label: t(`contacts.sort.${by}`),
    onCheckedChange: () => updateSystemStatus({ contactListSortBy: by }),
    type: 'checkbox' as const,
  }));

  if (!isInit && items.length === 0)
    return error ? (
      <AsyncError error={error} variant="inline" onRetry={() => void mutate()} />
    ) : (
      <SkeletonList paddingBlock={8} />
    );

  const renderAgents = (list: SidebarAgentItem[]) =>
    list.map((item) => <Contact active={item.id === activeRouteId} item={item} key={item.id} />);
  const sections = [
    // Requests waiting for an answer lead; the section is left out when there are none.
    ...(requests.length > 0
      ? [
          {
            count: requests.length,
            key: 'requests',
            render: () =>
              requests.map((request) => (
                <RequestRow
                  active={request.user.id === activeRouteId}
                  key={request.id}
                  request={request}
                />
              )),
            title: t('contacts.requests'),
          },
        ]
      : []),
    // Pinned contacts lead, like the Messages list; the section is left out until one is pinned.
    ...(pinned.length > 0
      ? [
          {
            count: pinned.length,
            key: 'pinned',
            render: () => renderAgents(pinned),
            title: t('contacts.pinned'),
          },
        ]
      : []),
    ...(channelsEnabled
      ? [
          {
            count: people.length,
            key: 'people',
            render: () =>
              people.map((item) => (
                <PersonRow active={item.user.id === activeRouteId} item={item} key={item.user.id} />
              )),
            title: t('contacts.people'),
          },
        ]
      : []),
    // Groups next: there are few, and they would sink below every agent.
    {
      count: groups.length,
      key: 'groups',
      render: () => renderAgents(groups),
      title: t('contacts.groups'),
    },
    {
      count: agents.length,
      key: 'agents',
      render: () => renderAgents(agents),
      title: t('navPanel.agent'),
    },
    ...(sharedAgents.length > 0
      ? [
          {
            count: sharedAgents.length,
            key: 'sharedAgents',
            render: () =>
              sharedAgents.map((item) => (
                <SharedAgentRow
                  active={item.agent.agentId === activeRouteId}
                  item={item}
                  key={item.agent.agentId}
                />
              )),
            title: t('contacts.sharedAgents'),
          },
        ]
      : []),
  ];

  // The standard sidebar accordion (same as the home sidebar sections), so
  // each section collapses independently with the shared header styling.
  return (
    <Flexbox paddingBlock={'4px 12px'} paddingInline={4}>
      <AccordionRoot
        // Listed up front so a section that appears later, like the first pin, opens expanded.
        defaultValue={['requests', 'pinned', 'people', 'groups', 'agents', 'sharedAgents']}
        indicatorPlacement={'inline'}
        style={{ gap: 8 }}
      >
        {sections.map((section) => (
          <AccordionItem key={section.key} value={section.key}>
            <AccordionHeader>
              <AccordionTrigger style={{ paddingBlock: 4, paddingInline: '8px 4px' }}>
                <Flexbox horizontal align={'center'} gap={4}>
                  <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
                    {section.title}
                  </Text>
                  <Text fontSize={11} type={'secondary'}>
                    {section.count}
                  </Text>
                </Flexbox>
              </AccordionTrigger>
              {/* One order for both sections; the hover action sits where the home sidebar keeps its section actions. */}
              <Flexbox
                horizontal
                align={'center'}
                className={cx(
                  'accordion-action',
                  accordionStyles.action,
                  accordionStyles.actionBorderless,
                )}
              >
                <DropdownMenu items={sortMenuItems} placement={'bottomRight'}>
                  <ActionIcon
                    icon={ArrowDownUpIcon}
                    size={'small'}
                    title={t('contacts.sort.tooltip')}
                  />
                </DropdownMenu>
              </Flexbox>
            </AccordionHeader>
            <AccordionPanel>
              <Flexbox gap={1} paddingBlock={1} paddingInline={2}>
                {section.count === 0 ? (
                  <div {...stylex.props(styles.empty)}>{t('contacts.empty')}</div>
                ) : (
                  section.render()
                )}
              </Flexbox>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </AccordionRoot>
    </Flexbox>
  );
});

Body.displayName = 'ContactListBody';

export { Body as ContactListBody };

const Header = memo(() => {
  const { t } = useTranslation('common');
  const { createTopLevelMenuItems, isLoading } = useCreateMenuItems();
  const channelsEnabled = useChannelsEnabled();
  const createItems = useMemo(
    () => [
      ...(channelsEnabled
        ? [
            {
              icon: <Icon icon={UserRoundSearchIcon} />,
              key: 'addContact',
              label: t('contacts.add'),
              onClick: () => openAddContactModal(),
            },
            { type: 'divider' as const },
          ]
        : []),
      ...createTopLevelMenuItems(),
    ],
    [channelsEnabled, createTopLevelMenuItems, t],
  );

  return (
    <ListHeader
      title={t('tab.contacts')}
      actions={
        <DropdownMenu items={createItems}>
          <ActionIcon
            icon={UserRoundPlusIcon}
            loading={isLoading}
            size={DESKTOP_HEADER_ICON_SMALL_SIZE}
            title={t('contacts.create')}
          />
        </DropdownMenu>
      }
    />
  );
});

Header.displayName = 'ContactListHeader';

/**
 * Contacts tab list column: every agent and group, by name or most recently updated. A row opens
 * the contact card (`/agents/:id`) and keeps the list in place; the card is
 * where the user starts a chat or goes on to edit the profile.
 */
const ContactListPortal = () => (
  <NavPanelPortal navKey={NAV_PANEL_CONTACTS_KEY}>
    <AgentModalProvider>
      <SideBarLayout body={<Body />} header={<Header />} />
    </AgentModalProvider>
  </NavPanelPortal>
);

export default ContactListPortal;
