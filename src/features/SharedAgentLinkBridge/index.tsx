'use client';

import { useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { toast } from '@lobehub/ui';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { SHARED_AGENT_URL } from '@/features/ContactList/const';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { sharedAgentLinkService } from '@/services/electron/sharedAgentLink';

/**
 * Opens the profile of the shared Agent a share page's "Open in Lobot" points at, where the
 * person chooses to message it or add it to contacts. Mounted with the signed-in
 * layout, so a link that arrived during a cold start or before sign-in opens once the person is
 * in; the main process holds it until then and hands it out once.
 */
const SharedAgentLinkBridge = memo(() => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();
  const opening = useRef(false);

  const openPending = useCallback(async () => {
    if (opening.current) return;
    opening.current = true;
    try {
      // Taking clears it, so a link opens once even if both the mount and a broadcast ask.
      for (let share = await sharedAgentLinkService.takePending(); share;) {
        navigate(SHARED_AGENT_URL(share));
        share = await sharedAgentLinkService.takePending();
      }
    } catch (error) {
      console.error('[shared-agent-link] Failed to open a shared Agent', error);
      toast.error(t('contacts.agent.unavailable'));
    } finally {
      opening.current = false;
    }
  }, [navigate, t]);

  useEffect(() => {
    void openPending();
  }, [openPending]);
  useWatchBroadcast('sharedAgentLinkReceived', () => void openPending());

  return null;
});

SharedAgentLinkBridge.displayName = 'SharedAgentLinkBridge';

export default SharedAgentLinkBridge;
