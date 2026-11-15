import { CHANNEL_URL } from '@lobechat/const';
import type { ContactAgentProfile } from '@lobechat/types';
import { toast } from '@lobehub/ui';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { channelActions } from '@/store/channel';

/**
 * Opens the direct conversation with another person's shared Agent straight from its share:
 * no friendship with the owner and no contact entry is needed. Adding it to contacts stays a
 * separate, optional step.
 */
export const useMessageSharedAgent = (onOpened?: () => void) => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();
  const [opening, setOpening] = useState(false);

  const message = useCallback(
    async (agent: Pick<ContactAgentProfile, 'agentId' | 'shareId'>) => {
      setOpening(true);
      try {
        const channelId = await channelActions.openShared(agent);
        if (!channelId) {
          toast.error(t('contacts.agent.unavailable'));
          return;
        }
        onOpened?.();
        navigate(CHANNEL_URL(channelId));
      } catch (error) {
        console.error('[contacts] Failed to open a shared Agent', error);
        toast.error(t('contacts.actionFailed'));
      } finally {
        setOpening(false);
      }
    },
    [navigate, onOpened, t],
  );

  return { message, opening };
};
