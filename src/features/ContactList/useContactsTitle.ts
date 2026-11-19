import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';

/** Inside a workspace the address book lists its members; the personal space keeps "Contacts". */
export const useContactsTitle = () => {
  const { t } = useTranslation('common');
  return t(useActiveWorkspaceId() ? 'tab.members' : 'tab.contacts');
};
