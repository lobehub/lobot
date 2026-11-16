import type { RouteObject } from 'react-router';

import { agentsRouteMeta } from '@/features/AgentViewAll/routeMeta';
import { channelRouteMeta, channelSettingsRouteMeta } from '@/features/Channels/routeMeta';
import { dynamicElement, ErrorBoundary, redirectElement } from '@/utils/router';

/**
 * Lobot exposes two surfaces only: the Contacts list (agents) and Channels.
 */
export const collaborationRoutes: RouteObject[] = [
  // Contacts: the flat list of workspace/private agents plus a single contact.
  {
    children: [
      {
        element: dynamicElement(() => import('@/routes/(main)/agents'), 'Desktop > Contacts', {
          preloadId: 'agents',
        }),
        handle: { meta: agentsRouteMeta },
        index: true,
      },
      {
        element: dynamicElement(
          () => import('@/routes/(main)/agents/[id]'),
          'Desktop > Contacts > Contact',
          { preloadId: 'agents' },
        ),
        handle: { meta: agentsRouteMeta },
        path: ':id',
      },
      {
        element: dynamicElement(
          () => import('@/routes/(main)/agents/people/[userId]'),
          'Desktop > Contacts > Person',
          { preloadId: 'agents' },
        ),
        handle: { meta: agentsRouteMeta },
        path: 'people/:userId',
      },
      {
        element: dynamicElement(
          () => import('@/routes/(main)/agents/shared/[share]'),
          'Desktop > Contacts > Shared Agent',
          { preloadId: 'agents' },
        ),
        handle: { meta: agentsRouteMeta },
        path: 'shared/:share',
      },
    ],
    errorElement: <ErrorBoundary resetPath=".." />,
    path: 'agents',
  },

  // Channels: the list lives in the home sidebar; a thread opens beside it via `?thread=`.
  {
    children: [
      // No collection page: old `/channels` links return home, where the list lives.
      { element: redirectElement('..'), index: true },
      {
        element: dynamicElement(
          () => import('@/routes/(main)/channels/[channelId]'),
          'Desktop > Channel',
          { preloadId: 'channels' },
        ),
        handle: { meta: channelRouteMeta },
        path: ':channelId',
      },
      {
        element: dynamicElement(
          () => import('@/routes/(main)/channels/[channelId]/settings'),
          'Desktop > Channel Settings',
          { preloadId: 'channels' },
        ),
        handle: { meta: channelSettingsRouteMeta },
        path: ':channelId/settings',
      },
    ],
    errorElement: <ErrorBoundary resetPath=".." />,
    path: 'channels',
  },
];
