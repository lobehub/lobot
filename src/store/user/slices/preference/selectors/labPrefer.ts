import { DEFAULT_PREFERENCE } from '@lobechat/const';

import { type UserState } from '@/store/user/initialState';

export const labPreferSelectors = {
  enableEvalCapture: (s: UserState): boolean => s.preference.lab?.enableEvalCapture ?? false,
  enableMessageTextSelectionActions: (s: UserState): boolean =>
    s.preference.lab?.enableMessageTextSelectionActions ??
    DEFAULT_PREFERENCE.lab?.enableMessageTextSelectionActions ??
    false,
  enableSelfLearning: (s: UserState): boolean => s.preference.lab?.enableSelfLearning ?? false,
  enableProjects: (s: UserState): boolean => s.preference.lab?.enableProjects ?? false,
  // `updateLab` writes both keys, but older clients only write the legacy
  // `enableTopicAcceptance` — so while both exist it holds the latest choice.
  enableGoals: (s: UserState): boolean =>
    s.preference.lab?.enableTopicAcceptance ?? s.preference.lab?.enableGoals ?? false,
  enableTopicBugReport: (s: UserState): boolean => s.preference.lab?.enableTopicBugReport ?? false,
};
