/**
 * Popup focus for a popover of replies. Opened by keyboard it moves focus in as usual; opened by
 * pointer it leaves focus on the trigger, or its first row would take focus and show that row's
 * open-topic and stop actions before the pointer reaches it.
 */
export const REPLY_POPUP_PROPS = {
  initialFocus: (openType: string) => openType === 'keyboard',
};
