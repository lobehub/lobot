/**
 * Marks an anchor whose click the renderer handles itself (Portal / SPA navigation).
 *
 * The desktop renderer runs on the `app://renderer` origin, so the preload click
 * interceptor cannot tell an internal LobeHub URL from a third-party one by origin
 * alone. The renderer — which owns the route semantics, including runtime-only data
 * like workspace slugs — declares ownership with this attribute, and the interceptor
 * leaves those clicks untouched so the React `onClick` can run.
 */
export const RENDERER_HANDLED_LINK_ATTR = 'data-lobe-renderer-link';

// Desktop window constants
export const TITLE_BAR_HEIGHT = 38;

export const APP_WINDOW_MIN_SIZE = {
  height: 600,
  width: 400,
} as const;

// HTTP Headers for desktop-server communication
/**
 * Header to indicate that a 401 response is due to a real authentication failure
 * (e.g., token expired) rather than other 401 causes (e.g., invalid API keys).
 *
 * When the server sets this header to 'true', the desktop app should trigger
 * re-authentication flow.
 */
export const AUTH_REQUIRED_HEADER = 'X-Auth-Required';

/**
 * Companion to X-Auth-Required: a short machine-readable reason for the 401
 * (e.g. `jwt_expired`, `jwt_signature`, `user_inactive`, `no_token`) so the
 * desktop main-process log can record WHY the server rejected the session
 * without access to server logs.
 */
export const AUTH_FAILURE_HEADER = 'X-Auth-Failure';

// TRPC error codes (mirrors @trpc/server internal codes)
