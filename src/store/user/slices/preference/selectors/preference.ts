import { DEFAULT_PREFERENCE } from '@lobechat/const';

import { type UserStore } from '@/store/user';

const useCmdEnterToSend = (s: UserStore): boolean => s.preference.useCmdEnterToSend || false;
const fontFamily = (s: UserStore): string | undefined =>
  s.preference.fontFamily?.trim() || undefined;
const terminalFontFamily = (s: UserStore): string | undefined =>
  s.preference.terminalFontFamily?.trim() || undefined;

export const preferenceSelectors = {
  fontFamily,
  terminalFontFamily,
  useCmdEnterToSend,
};
