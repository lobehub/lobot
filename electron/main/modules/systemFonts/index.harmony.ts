import type { DetailedSystemFont } from './index';

/**
 * HarmonyOS build: `font-list` throws on import for any platform but darwin,
 * win32 and linux, and the app sandbox has no fc-list to call. The settings
 * picker then offers only the application default, instead of a load error.
 */
export const listSystemFonts = async (): Promise<DetailedSystemFont[]> => [];
