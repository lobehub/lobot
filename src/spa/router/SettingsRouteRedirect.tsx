'use client';

import { useLayoutEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';

import {
  parsePersonalSettingsPath,
  useSettingsPopupStore,
} from '@/features/NavRail/settingsPopupStore';

/**
 * Personal settings now live in the Settings popup. Visiting `/settings` or
 * `/settings/:tab/:sub` queues the popup and returns to the main shell so the
 * deep link still works (email callbacks included) without the full-page layout.
 */
const SettingsRouteRedirect = () => {
  const params = useParams<{ sub?: string; tab?: string }>();
  const location = useLocation();

  useLayoutEffect(() => {
    const target = parsePersonalSettingsPath(
      `${location.pathname}${location.search}${location.hash}`,
    ) ?? {
      hash: location.hash.replace(/^#/, '') || null,
      subPage: params.sub ?? null,
      tab: params.tab,
    };
    useSettingsPopupStore.getState().queueOpen(target);
  }, [location.hash, location.pathname, location.search, params.sub, params.tab]);

  return <Navigate replace to="/" />;
};

export default SettingsRouteRedirect;
