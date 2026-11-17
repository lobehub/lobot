import { useActiveLocation } from '@/hooks/useActiveLocation';
import { SidebarTabKey } from '@/store/global/initialState';

/**
 * Returns the active tab key (chat/market/settings/...)
 * React Router version for SPA
 */
export const useActiveTabKey = () => {
  const { pathname } = useActiveLocation();
  return (pathname.split('/').find(Boolean)! as SidebarTabKey) || SidebarTabKey.Home;
};
