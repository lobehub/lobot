/**
 * Marketplace pick result helpers — shared between client-side install logic
 * and the custom interaction handler. Lives inside the marketplace package so
 * the tool-result format (what the AI ultimately reads) stays colocated with
 * the rest of the marketplace tool, decoupled from feature-layer plumbing.
 */

export interface InstallMarketplaceAgentSummary {
  avatar?: string;
  category?: string;
  description?: string;
  installedAgentId?: string;
  skipped: boolean;
  templateId: string;
  title?: string;
}
