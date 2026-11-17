import { getDesktopEnv } from '@/env';
import * as electronIs from '@/utils/platform';

export const isDev = electronIs.dev();

export const OFFICIAL_CLOUD_SERVER = getDesktopEnv().OFFICIAL_CLOUD_SERVER;
export const DESKTOP_EXTERNAL_NAVIGATION_HOSTS = getDesktopEnv().DESKTOP_EXTERNAL_NAVIGATION_HOSTS;

export const isMac = electronIs.macOS();
export const isWindows = electronIs.windows();
export const isLinux = electronIs.linux();
export const isOpenHarmony = electronIs.openHarmony();
