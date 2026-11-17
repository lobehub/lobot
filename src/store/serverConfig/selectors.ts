import { type ServerConfigStore } from './store';

export const featureFlagsSelectors = (s: ServerConfigStore) => s.featureFlags;

const EMPTY_PROVIDERS: string[] = [];

export const serverConfigSelectors = {
  agentIdentityProviders: (s: ServerConfigStore) =>
    s.serverConfig.agentIdentityProviders ?? EMPTY_PROVIDERS,
  disableEmailPassword: (s: ServerConfigStore) => s.serverConfig.disableEmailPassword || false,
  enableBusinessFeatures: (s: ServerConfigStore) => s.serverConfig.enableBusinessFeatures || false,
  enableComposio: (s: ServerConfigStore) => s.serverConfig.enableComposio || false,
  /** Runtime flag `dashboard`: dashboards, widget previews and the builtin-dashboard tool. */
  enableChannels: (s: ServerConfigStore) => s.featureFlags.enableChannels === true,
  enableDashboard: (s: ServerConfigStore) => s.featureFlags.enableDashboard === true,
  enableGatewayMode: (s: ServerConfigStore) => s.serverConfig.enableGatewayMode || false,
  /** Runtime flag `mcp_apps`: MCP Apps views in the conversation. */
  enableMcpApps: (s: ServerConfigStore) => s.featureFlags.enableMcpApps === true,
  enableMarketTrustedClient: (s: ServerConfigStore) =>
    s.serverConfig.enableMarketTrustedClient || false,
  oAuthSSOProviders: (s: ServerConfigStore) => s.serverConfig.oAuthSSOProviders,
};
