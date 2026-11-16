import type { ReactNode } from 'react';

import type { InputCompletionError } from '@/features/ChatInput/store/initialState';

interface BusinessInputCompletionErrorAlertParams {
  error?: InputCompletionError;
  onRetry: () => void;
}

interface BusinessInputCompletionErrorAlertResult {
  action?: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
}

export const useBusinessInputCompletionErrorAlert = (
  _params: BusinessInputCompletionErrorAlertParams,
): BusinessInputCompletionErrorAlertResult => ({});
