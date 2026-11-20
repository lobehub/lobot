'use client';

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
  toast,
} from '@lobehub/ui';
import { agentDisplayName, type SidebarAgentItem } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import isEqual from 'fast-deep-equal';
import { ArrowDownUpIcon, Pin, PinOff, UserRoundPlusIcon } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { useWorkspaceMembers } from '@/business/client/hooks/useWorkspaceMembers';
import AsyncError from '@/components/AsyncError';
import { DESKTOP_HEADER_ICON_SMALL_SIZE } from '@/const/layoutTokens';
import { openAddContactModal } from '@/features/AddContactModal';
import { personName } from '@/features/AddContactModal/result';
import { AVATAR_SIZE, ConversationRow, ListHeader } from '@/features/MessageList';
import SkeletonList from '@/features/NavPanel/components/SkeletonList';
import { NavPanelPortal } from '@/features/NavPanel/NavPanelPortal';
import { NAV_PANEL_CONTACTS_KEY } from '@/features/NavPanel/railRouteKey';
import SideBarLayout from '@/features/NavPanel/SideBarLayout';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { useFetchAgentList } from '@/hooks/useFetchAgentList';
import { usePermission } from '@/hooks/usePermission';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { CONTACT_URL } from './const';
import ContactAvatar from './ContactAvatar';
import { canPinContact } from './contactPin';
import { MemberRow, PersonRow, RequestRow, SharedAgentRow } from './ExternalRows';
import { contactPreviewPath, useContactPreview } from './previewContext';
import { CONTACT_SORT_BYS, groupContacts } from './sortContacts';
import { styles } from './style';
import { useContactsTitle } from './useContactsTitle';

const useActiveRouteId = () => {
  const previewCtx = useContactPreview();
  const { pathname } = useActiveLocation();
  const slug = useActiveWorkspaceSlug();
  const path = previewCtx ? contactPreviewPath(previewCtx.preview) : pathname;
  const segments = path.split('/').filter(Boolean);
  const [root, id, personId] = slug && segments[0] === slug ? segments.slice(1) : segments;
  // A person's card lives under `/agents/people/:userId`.
  if (root === 'agents' && id === 'people') return personId;

  return root === 'agents' || root === 'agent' || root === 'group' ? id : undefined;
};

const Contact = memo<{ active: boolean; item: SidebarAgentItem }>(({ active, item }) => {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const [pinAgent, pinAgentGroup] = useHomeStore((s) => [s.pinAgent, s.pinAgentGroup]);
  const inWorkspace = !!useActiveWorkspaceId();
  const { allowed: canManageTeamPins } = usePermission('manage_settings');
  const canPin = canPinContact({ canManageTeamPins, inWorkspace, visibility: item.visibility });
  const pinned = !!item.pinned;
  const togglePin = async () => {
    try {
      await (item.type === 'group' ? pinAgentGroup : pinAgent)(item.id, !pinned);
    } catch (error) {
      console.error('Failed to pin contact', error);
      toast.error(tCommon('operationFailed'));
    }
  };
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
      contextMenuItems={
        canPin
          ? () => [
              {
                icon: <Icon icon={pinned ? PinOff : Pin} />,
                key: 'pin',
                label: tCommon(pinned ? 'pinOff' : 'pin'),
                onClick: () => void togglePin(),
              },
            ]
          : undefined
      }
    />
  );
});

Contact.displayName = 'Contact';

const Body = memo<{ query?: string }>(({ query = '' }) => {
  const { t } = useTranslation('common');
  const { t: tChat } = useTranslation('chat');
  const { error, mutate } = useFetchAgentList();
  const isInit = useHomeStore(homeAgentListSelectors.isAgentListInit);
  const items = useHomeStore(homeAgentListSelectors.allAgents, isEqual);
  const activeRouteId = useActiveRouteId();
  const sortBy = useGlobalStore(systemStatusSelectors.contactListSortBy);
  const collapsedSections = useGlobalStore(
    systemStatusSelectors.contactListCollapsedSections,
    isEqual,
  );
  contactActions.useFetchList(true);
  contactActions.useFetchRequests(true);
  const externals = useContactStore((s) => contactSelectors.externals(s) ?? [], isEqual);
  const people = useContactStore((s) => contactSelectors.people(s) ?? [], isEqual);
  const shared = useContactStore((s) => contactSelectors.agents(s) ?? [], isEqual);
  const requests = useContactStore(contactSelectors.incomingRequests, isEqual);
  // In a workspace, its members can be messaged there without being contacts.
  const inWorkspace = !!useActiveWorkspaceId();
  const myId = useUserStore(userProfileSelectors.userId);
  const allMembers = useWorkspaceMembers();
  const members = useMemo(
    () => allMembers.filter((member) => member.userId !== myId),
    [allMembers, myId],
  );
  const updateSystemStatus = useGlobalStore((s) => s.updateSystemStatus);

  const { agents, pinned } = useMemo(
    () =>
      groupContacts(
        [...new Map(items.map((item) => [item.id, item])).values()],
        sortBy,
        tChat('untitledAgent'),
      ),
    [items, sortBy, tChat],
  );

  const untitled = tChat('untitledAgent');
  const q = query.trim().toLowerCase();
  const match = (name: string) => !q || name.toLowerCase().includes(q);
  const agentName = (item: SidebarAgentItem) => agentDisplayName(item, untitled);

  const visiblePinned = q ? pinned.filter((item) => match(agentName(item))) : pinned;
  const visiblePeople = q ? people.filter((item) => match(personName(item.user))) : people;
  const visibleAgents = q ? agents.filter((item) => match(agentName(item))) : agents;
  const visibleExternals = q ? externals.filter((item) => match(personName(item.user))) : externals;
  const visibleShared = q ? shared.filter((item) => match(item.agent.title || untitled)) : shared;
  const visibleRequests = q ? requests.filter((item) => match(personName(item.user))) : requests;
  const visibleMembers = q
    ? members.filter((member) =>
        match(
          personName({
            fullName: member.user?.fullName ?? null,
            username: member.user?.username ?? null,
          }),
        ),
      )
    : members;

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
  const renderShared = (external?: boolean) =>
    visibleShared.map((item) => (
      <SharedAgentRow
        active={item.agent.agentId === activeRouteId}
        external={external}
        item={item}
        key={item.agent.agentId}
      />
    ));
  const sections = [
    // Requests waiting for an answer lead; the section is left out when there are none.
    ...(visibleRequests.length > 0
      ? [
          {
            count: visibleRequests.length,
            key: 'requests',
            render: () =>
              visibleRequests.map((request) => (
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
    ...(visiblePinned.length > 0
      ? [
          {
            count: visiblePinned.length,
            key: 'pinned',
            render: () => renderAgents(visiblePinned),
            title: t('contacts.pinned'),
          },
        ]
      : []),
    // In the personal space, other people's Agents follow the people in the same section.
    ...(!inWorkspace
      ? [
          {
            count: visiblePeople.length + visibleShared.length,
            key: 'people',
            render: () => [
              ...visiblePeople.map((item) => (
                <PersonRow active={item.user.id === activeRouteId} item={item} key={item.user.id} />
              )),
              ...renderShared(),
            ],
            title: t('contacts.people'),
          },
        ]
      : []),
    ...(inWorkspace
      ? [
          {
            count: visibleMembers.length,
            key: 'members',
            render: () =>
              visibleMembers.map((member) => (
                <MemberRow
                  active={member.userId === activeRouteId}
                  key={member.userId}
                  member={member}
                />
              )),
            title: t('contacts.members'),
          },
        ]
      : []),
    // People outside the workspace whom a member invited; left out until there is one.
    ...(inWorkspace && visibleExternals.length > 0
      ? [
          {
            count: visibleExternals.length,
            key: 'externals',
            render: () =>
              visibleExternals.map((item) => (
                <PersonRow
                  active={item.user.id === activeRouteId}
                  item={item}
                  key={item.user.id}
                  tag={item.external?.openedToMe ? undefined : t('contacts.external.notOpened')}
                />
              )),
            title: t('contacts.externals'),
          },
        ]
      : []),
    // In a workspace, other people's Agents follow my own, tagged as external assistants.
    {
      count: visibleAgents.length + (inWorkspace ? visibleShared.length : 0),
      key: 'agents',
      render: () => [...renderAgents(visibleAgents), ...(inWorkspace ? renderShared(true) : [])],
      title: t('navPanel.agent'),
    },
  ];

  // Collapsed keys persist (not expanded ones), so a section that appears
  // later, like the first pin, still opens expanded.
  const expandedSections = sections
    .map((section) => section.key)
    .filter((key) => !collapsedSections.includes(key));
  const handleExpandedChange = (keys: unknown[]) => {
    const expanded = new Set(keys.map(String));
    // Keep collapsed keys of sections not rendered right now (e.g. requests
    // with nothing pending) so they stay collapsed when they come back.
    const visible = new Set(sections.map((section) => section.key));
    updateSystemStatus(
      {
        contactListCollapsedSections: [
          ...collapsedSections.filter((key) => !visible.has(key)),
          ...[...visible].filter((key) => !expanded.has(key)),
        ],
      },
      'toggleContactListSection',
    );
  };

  // The standard sidebar accordion (same as the home sidebar sections), so
  // each section collapses independently with the shared header styling.
  return (
    <Flexbox
      paddingBlock={'4px 12px'}
      paddingInline={4}
      style={{ minWidth: 0, overflowX: 'hidden' }}
    >
      <AccordionRoot
        indicatorPlacement={'inline'}
        style={{ gap: 8 }}
        value={expandedSections}
        onValueChange={handleExpandedChange}
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
  const title = useContactsTitle();
  // Creating agents and groups lives in the home sidebar; here the header only finds new contacts.

  return (
    <ListHeader
      title={title}
      actions={
        <ActionIcon
          icon={UserRoundPlusIcon}
          size={DESKTOP_HEADER_ICON_SMALL_SIZE}
          title={t('contacts.add')}
          onClick={() => openAddContactModal()}
        />
      }
    />
  );
});

Header.displayName = 'ContactListHeader';

export { Header as ContactListHeader };

/** The Contacts list column (header + body), used by the shell panel and the Contacts popup. */
export const ContactListPanel = () => <SideBarLayout body={<Body />} header={<Header />} />;

/**
 * Contacts tab list column: every agent and group, by name or most recently updated. A row opens
 * the contact card (`/agents/:id`) and keeps the list in place; the card is
 * where the user starts a chat or goes on to edit the profile.
 */
const ContactListPortal = () => (
  <NavPanelPortal navKey={NAV_PANEL_CONTACTS_KEY}>
    <ContactListPanel />
  </NavPanelPortal>
);

export default ContactListPortal;
