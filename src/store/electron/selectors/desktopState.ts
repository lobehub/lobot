import { type ElectronState } from '@/store/electron/initialState';

const userPath = (s: ElectronState) => s.appState.userPath;
const userHomePath = (s: ElectronState) => userPath(s)?.home || '';

export const desktopStateSelectors = {
  userHomePath,
  userPath,
};
