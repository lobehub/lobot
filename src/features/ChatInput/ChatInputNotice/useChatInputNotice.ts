import { useChatInputResourceAccess } from '@/features/ChatInput/hooks/useChatInputResourceAccess';

/** A persistent notice beside the composer actions. */
export interface ChatInputNotice {
  key: 'input.viewOnlyAgent' | 'input.viewOnlyGroup';
  type: 'warning';
}

/**
 * Collects all persistent notices for the active chat input: view-level General access on the
 * bound agent or group makes the whole input read-only.
 *
 * Use-level General access (can chat, can't edit the shared config) is deliberately not a
 * notice: the locked controls explain themselves instead.
 */
export const useChatInputNotices = (): ChatInputNotice[] => {
  const { canUseResource, isGroupContext } = useChatInputResourceAccess();
  if (canUseResource) return [];

  return [{ key: isGroupContext ? 'input.viewOnlyGroup' : 'input.viewOnlyAgent', type: 'warning' }];
};
