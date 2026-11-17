import { isSameTabScope, resolveTabScope, type TabScope } from './scope';

type TabUpdate = { type: 'rewrite' } | { scope: TabScope; type: 'scope-swap'; url: string };

export const resolveTabUpdate = (activeTabScope: TabScope, reportedUrl: string): TabUpdate => {
  const scope = resolveTabScope(reportedUrl);
  if (isSameTabScope(activeTabScope, scope)) return { type: 'rewrite' };

  return { scope, type: 'scope-swap', url: reportedUrl };
};
