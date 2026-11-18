import { lambdaClient } from '@/libs/trpc/client';
import { type SessionGroupItem } from '@/types/session';

/**
 * @deprecated Session service is legacy. Use agentService for agent CRUD operations.
 * Retains session-shell compatibility and independent session-group operations.
 */
export class SessionService {
  // ************************************** //
  // ***********  SessionGroup  *********** //
  // ************************************** //

  createSessionGroup = (
    name: string,
    sort?: number,
    visibility?: 'private' | 'public',
  ): Promise<string> => {
    return lambdaClient.sessionGroup.createSessionGroup.mutate({ name, sort, visibility });
  };

  removeSessionGroup = (id: string, removeChildren?: boolean) => {
    return lambdaClient.sessionGroup.removeSessionGroup.mutate({ id, removeChildren });
  };

  /** Rename / reorder only — scope fields are rejected server-side. */
  updateSessionGroup = (id: string, value: Partial<Pick<SessionGroupItem, 'name' | 'sort'>>) => {
    return lambdaClient.sessionGroup.updateSessionGroup.mutate({ id, value });
  };

  updateSessionGroupOrder = (sortMap: { id: string; sort: number }[]) => {
    return lambdaClient.sessionGroup.updateSessionGroupOrder.mutate({ sortMap });
  };
}

export const sessionService = new SessionService();
