import { useEffect } from 'react';

import { writeImLayoutHint } from './layoutHint';

/** Remember the rendered layout so the next boot skeleton matches it. */
export const useSyncImLayoutHint = (enabled: boolean) => {
  useEffect(() => writeImLayoutHint(enabled), [enabled]);
};
