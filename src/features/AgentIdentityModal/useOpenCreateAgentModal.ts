import { useCallback } from 'react';

import { usePermission } from '@/hooks/usePermission';

import { openCreateAgentIdentityModal, type OpenCreateAgentIdentityModalOptions } from './index';
import { useLandOnCreatedAgent } from './useLandOnCreatedAgent';

type OpenCreateAgentModalParams = Pick<
  OpenCreateAgentIdentityModalOptions,
  'groupId' | 'onClosed' | 'visibility'
>;

/**
 * Opens the create-agent form from anywhere — the command menu, the desktop
 * File menu, or a surface outside `AgentModalProvider`. The modal renders in the
 * global ModalHost, so the caller may unmount (the command menu closes) while
 * it stays open; the new agent opens in its direct Channel.
 */
export const useOpenCreateAgentModal = () => {
  const landOnCreatedAgent = useLandOnCreatedAgent();
  const { allowed: canCreate } = usePermission('create_content');

  return useCallback(
    (params?: OpenCreateAgentModalParams) => {
      if (!canCreate) return;

      return openCreateAgentIdentityModal({
        ...params,
        onCreated: (agentId) => void landOnCreatedAgent(agentId),
      });
    },
    [canCreate, landOnCreatedAgent],
  );
};
