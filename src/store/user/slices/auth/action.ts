import { clearActiveScopeKey } from '@/libs/swr/useCacheScope';
import { type StoreSetter } from '@/store/types';

import { clearUserDisplaySnapshot } from '../../displaySnapshot';
import { type UserStore } from '../../store';

type Setter = StoreSetter<UserStore>;
export const createAuthSlice = (set: Setter, get: () => UserStore, _api?: unknown) =>
  new UserAuthActionImpl(set, get, _api);

class UserAuthActionImpl {
  readonly #get: () => UserStore;

  constructor(set: Setter, get: () => UserStore, _api?: unknown) {
    void _api;
    this.#get = get;
  }

  logout = async (options?: { redirectTo?: string }): Promise<void> => {
    // Capture the owner before any async work. The store may be updated by a
    // concurrent session event before Better Auth confirms this sign-out.
    const signingOutUserId = this.#get().user?.id;

    // Clear the OIDC Provider session for the current browser *before*
    // destroying the better-auth session. This prevents a stale OIDC session
    // from silently issuing tokens for the old account after the user signs
    // in as someone else.
    try {
      await fetch('/oidc/clear-session', { method: 'POST' });
    } catch {
      // Best-effort: don't block sign-out if the cleanup request fails
    }

    const { signOut } = await import('@/libs/better-auth/auth-client');
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          // Drop the persisted active scope so the next boot doesn't hydrate the
          // signed-out user's cache (localStorage survives the reload below).
          clearActiveScopeKey();
          clearUserDisplaySnapshot(signingOutUserId);
          // Use window.location.href to trigger a full page reload
          // This ensures all client-side state (React, Zustand, cache) is cleared
          window.location.href = options?.redirectTo || '/signin';
        },
      },
    });
  };

  openLogin = async (reason?: 'sessionExpired'): Promise<void> => {
    // Skip if already on a login page (/signin, /signup)
    const pathname = location.pathname;
    if (pathname.startsWith('/signin') || pathname.startsWith('/signup')) {
      return;
    }

    const currentUrl = location.toString();
    const params = new URLSearchParams({ callbackUrl: currentUrl });
    if (reason) params.set('reason', reason);
    window.location.href = `/signin?${params.toString()}`;
  };
}

export type UserAuthAction = Pick<UserAuthActionImpl, keyof UserAuthActionImpl>;
