import { useSearchParams } from 'react-router';

/** The search param that opens a Channel's settings beside its feed. */
export const CHANNEL_SETTINGS_PARAM = 'settings';

/**
 * Opens the settings of the Channel on screen beside its feed. They replace a thread opened beside
 * it; a thread shown as the page stays.
 */
export const useOpenChannelSettings = () => {
  const [, setParams] = useSearchParams();
  return () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set(CHANNEL_SETTINGS_PARAM, '1');
      if (next.get('view') !== 'page') next.delete('thread');
      return next;
    });
};
