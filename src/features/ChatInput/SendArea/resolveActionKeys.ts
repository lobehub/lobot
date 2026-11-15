import type { ActionKey } from '../ActionBar/config';
import type { State } from '../store/initialState';

/**
 * Resolve which right actions the SendArea itself renders.
 *
 * Active audio controls stay in the region where their action is configured.
 * If dictation is a left action, SendArea must not render a duplicate copy on
 * the right while the session is active.
 */
export const resolveSendAreaActionKeys = (
  rightActions: ActionKey[] | undefined,
  activeAudioInputMode?: State['activeAudioInputMode'],
): ActionKey[] => {
  const keys = rightActions || [];

  if (activeAudioInputMode) {
    const activeActionKey =
      activeAudioInputMode === 'dictation' ? 'voiceDictation' : 'voiceMessage';

    return keys.includes(activeActionKey) ? [activeActionKey] : [];
  }

  return keys;
};
