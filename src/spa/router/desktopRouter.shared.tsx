'use client';

import { createElement, type ReactElement } from 'react';
import type { RouteObject } from 'react-router';

import { BusinessDesktopRoutesWithoutMainLayout } from '@/business/client/BusinessDesktopRoutes';
import AppShellSkeleton, { APP_SHELL_FALLBACK_ID } from '@/spa/BootShell/AppShellSkeleton';
import { onboardingRoute } from '@/spa/router/onboardingRoute';
import { withSegmentFallback } from '@/spa/router/withSegmentFallback';
import { dynamicLayout, ErrorBoundary } from '@/utils/router';

import { collaborationRoutes } from './collaborationRoutes';
import { settingsRoute } from './settingsRoutes';

export interface MainAreaRouteOptions {
  /** Electron renders Home inside each tab router; it redirects to the first Channel. */
  createHomeElement?: () => ReactElement;
}

const deferPlatformElement = (factory?: () => ReactElement) =>
  factory ? createElement(factory) : undefined;

/**
 * Lobot ships two surfaces, Contacts (agents) and Channels, plus Settings.
 * Every other LobeHub route is intentionally absent from this build.
 */
const createMainAreaChildrenDefinition = (options: MainAreaRouteOptions = {}): RouteObject[] => [
  { element: deferPlatformElement(options.createHomeElement), index: true },
  ...collaborationRoutes,
  settingsRoute,
];

/**
 * Creates one stable lazy-element tree per runtime while returning a fresh
 * top-level array for every React Router instance. This prevents per-tab
 * router creation from registering duplicate preload loaders.
 */
export const createMainAreaRouteFactory = (options: MainAreaRouteOptions = {}) => {
  const routes = createMainAreaChildrenDefinition(options);

  return (): RouteObject[] => [...routes];
};

interface SharedDesktopRouteOptions {
  mainAreaChildren: RouteObject[];
  /** Runtime-only routes, such as Electron `/desktop-onboarding`. */
  platformRoutes?: RouteObject[];
}

/**
 * Builds the common Web/Electron top-level route tree. Platform entry files
 * supply only the root children and runtime-only routes.
 */
export const createSharedDesktopRoutes = ({
  mainAreaChildren,
  platformRoutes = [],
}: SharedDesktopRouteOptions): RouteObject[] => [
  {
    children: withSegmentFallback(mainAreaChildren),
    // `BootShell` unmounts the moment the cache gate releases, which is often
    // before this chunk resolves. Falling back to the same skeleton keeps the
    // handoff invisible instead of flashing the brand logo a second time.
    element: dynamicLayout(() => import('@/routes/(main)/_layout'), 'Desktop > Main > Layout', {
      fallback: <AppShellSkeleton id={APP_SHELL_FALLBACK_ID} />,
    }),
    errorElement: <ErrorBoundary />,
    path: '/',
  },
  ...BusinessDesktopRoutesWithoutMainLayout,
  ...platformRoutes,
  onboardingRoute,
];
