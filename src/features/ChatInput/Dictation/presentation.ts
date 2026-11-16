import type { RealtimeDictationStatus } from './contract';

type DictationControlMode = 'busy' | 'error' | 'idle' | 'listening';

export const getDictationControlMode = (status: RealtimeDictationStatus): DictationControlMode => {
  if (status === 'listening') return 'listening';
  if (status === 'error') return 'error';
  if (status === 'idle') return 'idle';

  return 'busy';
};
