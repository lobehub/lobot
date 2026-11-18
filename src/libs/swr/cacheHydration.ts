const readyScopes = new Set<string>();
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const markPending = (scope: string): void => {
  if (!readyScopes.delete(scope)) return;

  emit();
};

export const cacheHydration = {
  isReady: (scope: string): boolean => readyScopes.has(scope),

  markReady: (scope: string): void => {
    if (readyScopes.has(scope)) return;

    readyScopes.add(scope);
    emit();
  },

  markPending,

  reset: markPending,

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
