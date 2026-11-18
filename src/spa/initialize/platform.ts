import { getPlatform } from '@/utils/platform';

/**
 * Tag `<html>` with the OS so global CSS can branch on it. Windows hides native
 * scrollbars (see `src/styles/global.css`): Chromium only fades them out there
 * when the OS accessibility settings allow, so they otherwise stay on screen.
 */
export const markPlatform = () => {
  if (getPlatform() === 'Windows') document.documentElement.dataset.platform = 'windows';
};
