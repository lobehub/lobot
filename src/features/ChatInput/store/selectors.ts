import { type InputCompletionError, type SendButtonProps, type State } from './initialState';
import { initialSendButtonState } from './initialState';

export const selectors = {
  inputCompletionErrorVisible: (s: State): InputCompletionError | undefined =>
    s.inputCompletionErrorDismissed ? undefined : s.inputCompletionError,
  sendButtonProps: (s: State): SendButtonProps => s.sendButtonProps || initialSendButtonState,
};
