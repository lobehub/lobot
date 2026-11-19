import { useCallback } from 'react';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { useSwitchWorkspace } from '@/business/client/hooks/useSwitchWorkspace';
import { useContactsPopupStore } from '@/features/NavRail/contactsPopupStore';
import { resolveRailTab } from '@/features/NavRail/railTab';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useActiveLocation } from '@/hooks/useActiveLocation';

import { useOpenCreateWorkspace } from './CreateWorkspace';

/**
 * Switching scope, shared by the rail and the list footer's menu. Lobot has no
 * workspace routes: switching changes the request scope, then lands on Messages.
 * A contact belongs to the scope just left, so the address book opens over that
 * home instead of keeping the full-screen contacts page.
 */
export const useOpenScope = () => {
  const { switchToPersonal, switchWorkspace } = useSwitchWorkspace();
  const navigate = useWorkspaceAwareNavigate();
  const { pathname } = useActiveLocation();
  const activeWorkspaceSlug = useActiveWorkspaceSlug();
  const railTab = resolveRailTab(pathname, activeWorkspaceSlug);
  const stayOnContacts = railTab === 'contacts';
  const openContacts = useContactsPopupStore((s) => s.openContacts);

  const openHome = useCallback(() => {
    if (stayOnContacts) openContacts();
    navigate('/', { escape: true });
  }, [navigate, openContacts, stayOnContacts]);

  const openPersonal = useCallback(async () => {
    await switchToPersonal();
    openHome();
  }, [openHome, switchToPersonal]);

  const openWorkspace = useCallback(
    async (id: string) => {
      await switchWorkspace(id);
      openHome();
    },
    [openHome, switchWorkspace],
  );

  const openCreate = useOpenCreateWorkspace(openHome);

  return {
    navigate,
    openContacts,
    openCreate,
    openPersonal,
    openWorkspace,
    railTab,
    stayOnContacts,
  };
};
