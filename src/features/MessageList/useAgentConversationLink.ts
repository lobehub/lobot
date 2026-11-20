import { CHANNEL_URL } from '@lobechat/const';
import { toast } from '@lobehub/ui';
import { useLatest } from 'ahooks';
import { t } from 'i18next';
import { type MouseEvent, useCallback, useRef } from 'react';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { resolveInboxAgentRouteId } from '@/features/AgentRoute/useResolvedAgentRouteId';
import { usePreservedAgentUrl } from '@/features/HomeSidebar/Body/Agent/List/usePreservedAgentUrl';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useActiveLocationReader } from '@/hooks/useActiveLocation';
import { cacheScope } from '@/libs/replica';
import { useAgentStore } from '@/store/agent';
import { builtinAgentSelectors } from '@/store/agent/selectors';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';

import { isPlainClick } from './conversations';

/**
 * An agent row opens the person's direct Channel with the Agent. An Agent made
 * before direct Channels has none yet, so the first click opens it. Lobot has no Agent page to
 * fall back to, so an Agent that cannot open one, or a failed open, keeps the person where they
 * are and says why. Without an id yet (the inbox Agent while it loads) the row links the Agent.
 */
export const useAgentConversationLink = (
  agentId: string | undefined,
  agentUrl: string,
  {
    pinOnOpen = false,
  }: {
    /** Pin the Channel the first click opens, so a row shown pinned before it stays pinned. */
    pinOnOpen?: boolean;
  } = {},
) => {
  const enabled = !!agentId;
  const directChannelId = useChannelStore((s) =>
    enabled ? channelSelectors.directByAgent(agentId!)(s)?.id : undefined,
  );
  const navigate = useWorkspaceAwareNavigate();
  const opening = useRef(false);
  const getLocation = useActiveLocationReader();
  const slug = useLatest(useActiveWorkspaceSlug());
  // Where the person is now. Opening a missing Channel takes a request, and by the time it
  // answers they may have picked another conversation or workspace. Read on demand: every list
  // row uses this hook, and subscribing would re-render all of them on each navigation.
  const here = useCallback(() => {
    const { pathname, search } = getLocation();
    return `${slug.current ?? ''}|${pathname}${search}`;
  }, [getLocation, slug]);

  const onClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!agentId || !isPlainClick(event)) return;
      event.preventDefault();
      if (opening.current) return;
      opening.current = true;
      const from = here();
      const scope = cacheScope.get();
      // Only a Channel this click creates: with the list not loaded yet, the server may return
      // one the person already unpinned.
      const pin = pinOnOpen && !!useChannelStore.getState().listMap.all;
      // Navigate only if nothing else was selected meanwhile, and never route an id from the
      // previous workspace under a new one.
      const go = (path: string) => {
        if (here() === from && cacheScope.get() === scope) navigate(path);
      };
      void channelActions
        .openDirect(agentId)
        .then((channelId) => {
          if (channelId && pin)
            void channelActions
              .setPinned(channelId, true)
              .catch((error) => console.error('[channel] Failed to pin Lobe AI', error));
          if (channelId) go(CHANNEL_URL(channelId));
          else toast.error(t('openDirect.unavailable', { ns: 'channel' }));
        })
        .catch((error) => {
          console.error('[channel] Failed to open the direct Channel', error);
          toast.error(t('openDirect.failed', { ns: 'channel' }));
        })
        .finally(() => {
          opening.current = false;
        });
    },
    [agentId, here, navigate, pinOnOpen],
  );

  if (directChannelId) return { url: CHANNEL_URL(directChannelId) };
  return { onClick: enabled ? onClick : undefined, url: agentUrl };
};

/**
 * The inbox Agent's row opens its direct Channel the same way any other Agent's row does. Lobe AI
 * starts pinned, so the Channel its first click opens is pinned too.
 */
export const useInboxConversationLink = () => {
  const inboxAgentId = useAgentStore(builtinAgentSelectors.inboxAgentId);
  const agentUrl = usePreservedAgentUrl(resolveInboxAgentRouteId(inboxAgentId));
  return useAgentConversationLink(inboxAgentId, agentUrl, { pinOnOpen: true });
};
