/**
 * Curated categories sourced from the marketplace onboarding-full API.
 * Slugs match the top-level keys of the API response.
 */
export enum MarketplaceCategory {
  BusinessStrategy = 'business-strategy',
  ContentCreation = 'content-creation',
  CreatorEconomy = 'creator-economy',
  DesignCreative = 'design-creative',
  Engineering = 'engineering',
  FinanceLegal = 'finance-legal',
  LearningResearch = 'learning-research',
  Marketing = 'marketing',
  Operations = 'operations',
  PeopleHR = 'people-hr',
  PersonalLife = 'personal-life',
  ProductManagement = 'product-management',
  SalesCustomer = 'sales-customer',
}

export const MARKETPLACE_CATEGORY_VALUES = Object.values(MarketplaceCategory);

/**
 * A single agent template shown in the marketplace picker.
 */
export interface AgentTemplate {
  /** Optional emoji or image URL — falls back to a category default in the UI. */
  avatar?: string;
  category: MarketplaceCategory;
  /** Optional one-line capability summary. Upstream marketplace API may omit this. */
  description?: string;
  /** Marketplace identifier (e.g. 'agent-template-copywriter'). */
  id: string;
  /** Human-readable title (English Title Case). */
  title: string;
}
