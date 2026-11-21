import type { ConnectorCatalogItem, LobehubSkillProviderType } from '@lobechat/const';

export type MarketCategory = 'development' | 'documents' | 'other' | 'productivity' | 'social';

/** Category order on the catalog page. */
export const MARKET_CATEGORIES: MarketCategory[] = [
  'productivity',
  'documents',
  'development',
  'social',
  'other',
];

/** A category shows this many rows until "View all" expands it. */
export const CATEGORY_PREVIEW_COUNT = 6;

const CATEGORY_BY_ID: Record<string, MarketCategory> = {
  'airtable': 'productivity',
  'cal-com': 'productivity',
  'clickup': 'productivity',
  'confluence': 'documents',
  'dropbox': 'documents',
  'figma': 'development',
  'github': 'development',
  'gmail': 'productivity',
  'google-calendar': 'productivity',
  'google-docs': 'documents',
  'google-drive': 'documents',
  'google-sheets': 'documents',
  'hubspot': 'productivity',
  'jira': 'development',
  'linear': 'development',
  'microsoft': 'productivity',
  'notion': 'documents',
  'onedrive': 'documents',
  'outlook-mail': 'productivity',
  'posthog': 'development',
  'salesforce': 'productivity',
  'slack': 'productivity',
  'supabase': 'development',
  'twitter': 'social',
  'vercel': 'development',
  'whatsapp': 'social',
  'youtube': 'social',
  'zendesk': 'productivity',
};

export interface MarketConnector {
  author: string;
  authorUrl?: string;
  category: MarketCategory;
  description: string;
  icon: LobehubSkillProviderType['icon'];
  /** Unqualified identifier; the catalog maps each one to a single source. */
  id: string;
  label: string;
  readme: string;
  source: ConnectorCatalogItem;
}

/** Flattens a LobeHub / Composio catalog entry into the one shape the Market renders. */
export const toMarketConnector = (source: ConnectorCatalogItem): MarketConnector => {
  const meta =
    source.type === 'lobehub'
      ? { ...source.provider, id: source.provider.id }
      : { ...source.serverType, id: source.serverType.identifier };

  return {
    author: meta.author,
    authorUrl: meta.authorUrl,
    category: CATEGORY_BY_ID[meta.id] ?? 'other',
    description: meta.description,
    icon: meta.icon,
    id: meta.id,
    label: meta.label,
    readme: meta.readme,
    source,
  };
};

/** Case-insensitive match on the name and the description. */
export const matchConnector = (connector: MarketConnector, query: string) => {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return (
    connector.label.toLowerCase().includes(keyword) ||
    connector.description.toLowerCase().includes(keyword)
  );
};

/** Groups connectors by category in `MARKET_CATEGORIES` order, skipping empty ones. */
export const groupConnectors = (connectors: MarketConnector[]) =>
  MARKET_CATEGORIES.map((category) => ({
    category,
    items: connectors.filter((connector) => connector.category === category),
  })).filter((group) => group.items.length > 0);
