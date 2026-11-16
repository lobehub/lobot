import { HotkeyEnum } from '@lobechat/const/hotkeys';

import { useHotkeyById } from './useHotkeyById';

/**
 * Save document hotkey (Cmd+S / Ctrl+S)
 * @param onSave - Callback invoked when the save hotkey is triggered
 */
export const useSaveDocumentHotkey = (onSave: () => void | Promise<void>) => {
  return useHotkeyById(
    HotkeyEnum.SaveDocument,
    () => {
      void onSave();
    },
    {
      enableOnContentEditable: true,
    },
  );
};
