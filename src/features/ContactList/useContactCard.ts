import { AGENT_CHAT_URL, AGENT_PROFILE_URL, GROUP_CHAT_URL } from '@lobechat/const';
import {
  agentDisplayName,
  agentSecondaryDisplayName,
  type SidebarAgentItem,
} from '@lobot/types';
import isEqual from 'fast-deep-equal';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { webAppUrl } from '@/features/Electron/navigation/webApp';
import { useResourceAccess } from '@/features/ResourcePermission/useResourceAccess';
import { useFetchAgentList } from '@/hooks/useFetchAgentList';
import { usePermission } from '@/hooks/usePermission';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';

interface ContactCardData {
  /** Who may open the profile editor; the server still checks every write. */
  canEdit: boolean;
  chatUrl: string;
  item: SidebarAgentItem;
  /** The contact's page on LobeHub Cloud, where it is managed; opened in the browser. */
  manageUrl: string;
  profileUrl: string;
  /** The agent's role beside its personal name; absent for groups and unnamed agents. */
  role?: string;
  slug?: string;
  title: string;
}

export type ContactCardState =
  | { error: unknown; retry: () => void; status: 'error' }
  | { status: 'loading' }
  | { status: 'missing' }
  | ({ status: 'ready' } & ContactCardData);

/**
 * Everything the contact card shows for an agent or group, read from the
 * already-loaded contact list. A failed first load is `error` rather than an
 * endless `loading`: on mobile no Contacts list sits beside the card to offer
 * the retry.
 */
export const useContactCard = (id: string): ContactCardState => {
  const { t } = useTranslation('chat');
  const { error, mutate } = useFetchAgentList();
  const isInit = useHomeStore(homeAgentListSelectors.isAgentListInit);
  const item = useHomeStore(homeAgentListSelectors.getAgentById(id), isEqual);
  const isGroup = item?.type === 'group';
  // The web address carries the active workspace; re-render when it switches.
  useActiveWorkspaceId();

  const { allowed: canEditContent } = usePermission('edit_own_content');
  const { canEditResource } = useResourceAccess(
    isGroup ? 'agentGroup' : 'agent',
    item ? id : undefined,
  );

  if (!item) {
    if (isInit) return { status: 'missing' };
    return error ? { error, retry: () => void mutate(), status: 'error' } : { status: 'loading' };
  }

  const chatUrl = isGroup ? GROUP_CHAT_URL(id) : AGENT_CHAT_URL(id);

  return {
    canEdit: !!canEditContent && canEditResource,
    chatUrl,
    item,
    manageUrl: webAppUrl(chatUrl),
    profileUrl: isGroup ? `/group/${id}/profile` : AGENT_PROFILE_URL(id),
    role: isGroup ? undefined : agentSecondaryDisplayName(item),
    slug: isGroup ? undefined : item.slug || undefined,
    status: 'ready',
    title: isGroup ? item.title || t('untitledAgent') : agentDisplayName(item, t('untitledAgent')),
  };
};
