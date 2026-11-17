import { DEFAULT_SYSTEM_AGENT_CONFIG } from '@/const/settings';
import { type UserStore } from '@/store/user';
import { merge } from '@/utils/merge';

import { currentSettings } from './settings';

const currentSystemAgent = (s: UserStore) =>
  merge(DEFAULT_SYSTEM_AGENT_CONFIG, currentSettings(s).systemAgent);
const asr = (s: UserStore) => currentSystemAgent(s).asr;
const isAsrConfigured = (s: UserStore) => {
  const { model, provider } = asr(s);

  return !!model && !!provider;
};
const topic = (s: UserStore) => currentSystemAgent(s).topic;
const thread = (s: UserStore) => currentSystemAgent(s).thread;
const inputCompletion = (s: UserStore) => currentSystemAgent(s).inputCompletion;
const followUpAction = (s: UserStore) => currentSystemAgent(s).followUpAction;

export const systemAgentSelectors = {
  asr,
  followUpAction,
  inputCompletion,
  isAsrConfigured,
  thread,
  topic,
};
