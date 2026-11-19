import type { RouteObject } from 'react-router';

import { settingsRouteMeta } from '@/features/Settings/features/routeMeta';
import { ErrorBoundary } from '@/utils/router';

import SettingsRouteRedirect from './SettingsRouteRedirect';

/**
 * Personal settings open in the Settings popup. These routes exist so deep
 * links and email callbacks still resolve, then redirect to the main shell.
 */
export const settingsRoute: RouteObject = {
  children: [
    { element: <SettingsRouteRedirect />, handle: { meta: settingsRouteMeta }, index: true },
    { element: <SettingsRouteRedirect />, handle: { meta: settingsRouteMeta }, path: ':tab' },
    { element: <SettingsRouteRedirect />, handle: { meta: settingsRouteMeta }, path: ':tab/:sub' },
  ],
  errorElement: <ErrorBoundary resetPath="/" />,
  path: 'settings',
};
