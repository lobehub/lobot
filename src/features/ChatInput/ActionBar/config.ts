import VoiceDictation from '../Dictation';
import VoiceMessage from '../VoiceMessage';
import Typo from './Typo';

export const actionMap = {
  typo: Typo,
  voiceDictation: VoiceDictation,
  voiceMessage: VoiceMessage,
} as const;

export type ActionKey = keyof typeof actionMap;

export type ActionKeys = ActionKey | ActionKey[] | '---';
