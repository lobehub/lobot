import type { UpdateKind, UpdaterStage } from '@lobechat/electron-client-ipc';

export type InstallConfirmMode = 'unconfirm' | 'installLater' | 'installNow' | null;

export type UpdateIslandView =
  'downloading' | 'app-ready' | 'reload-ready' | 'relaunch-ready' | 'install-later' | 'applied';

export interface UpdateIslandInput {
  appliedVersion: string | null;
  installConfirmMode: InstallConfirmMode;
  updateKind: UpdateKind | null;
  updaterStage: UpdaterStage | null;
}

/**
 * Which update island the title bar shows.
 * An app update that the user already deferred stays hidden: `installConfirmMode`
 * goes null while `updateKind` is still `app`. A download only takes the slot
 * when nothing else is waiting to be installed.
 */
export const selectUpdateIsland = ({
  appliedVersion,
  installConfirmMode,
  updateKind,
  updaterStage,
}: UpdateIslandInput): UpdateIslandView | null => {
  if (updateKind === 'renderer' || updateKind === 'core-reload') return 'reload-ready';
  if (updateKind === 'core-relaunch') return 'relaunch-ready';
  if (updateKind === 'app') {
    if (installConfirmMode === 'installLater') return 'install-later';
    if (installConfirmMode === 'unconfirm') return 'app-ready';
    return null;
  }
  if (updaterStage === 'downloading') return 'downloading';
  if (appliedVersion) return 'applied';
  return null;
};

export const formatUpdatePercent = (percent: number | null | undefined): number | null => {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return null;
  return Math.min(100, Math.max(0, Math.round(percent)));
};
