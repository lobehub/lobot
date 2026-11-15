const randomClientId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

let clientId: string | undefined;

/**
 * This page's id towards the Agent Gateway.
 *
 * One value per page load, shared by the multiplexed socket (`?clientId=`) and
 * the v1 socket's `auth` message. A reload is a new client on purpose: the old
 * page's in-flight attempts died with it.
 */
export const getGatewayClientId = (): string => {
  clientId ??= randomClientId();
  return clientId;
};
