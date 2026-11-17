'use client';

import { createContext, use } from 'react';

import type { RouteSkeletonChrome } from './routeMeta';

const RouteSkeletonChromeContext = createContext<RouteSkeletonChrome>('page');

export const useRouteSkeletonChrome = () => use(RouteSkeletonChromeContext);
