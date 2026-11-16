import type { AgentTemplate, MarketplaceCategory } from './types';
import { MARKETPLACE_CATEGORY_VALUES } from './types';

const MARKETPLACE_CATEGORY_SET = new Set<string>(MARKETPLACE_CATEGORY_VALUES);

export interface RawAgentTemplate {
  avatar?: string;
  description?: string;
  identifier?: string;
  name?: string;
}

export const normalizeAgentTemplate = (
  item: RawAgentTemplate,
  category: string,
): AgentTemplate | undefined => {
  if (!item.identifier || !item.name) return undefined;
  if (!MARKETPLACE_CATEGORY_SET.has(category)) return undefined;
  return {
    avatar: item.avatar,
    category: category as MarketplaceCategory,
    description: item.description,
    id: item.identifier,
    title: item.name,
  };
};

interface FetchAgentTemplatesOptions {
  signal?: AbortSignal;
}

export type AgentTemplateFetcher = (
  options?: FetchAgentTemplatesOptions,
) => Promise<AgentTemplate[]>;

export const getAgentTemplatesSWRKey = (locale?: string) =>
  `builtin-tool-web-onboarding/agent-marketplace/onboarding-templates/${locale ?? 'default'}`;

export const getTemplatesByCategories = (
  templates: AgentTemplate[],
  categories: string[],
): AgentTemplate[] => {
  if (categories.length === 0) return templates;
  const set = new Set(categories);
  return templates.filter((t) => set.has(t.category));
};

export const getTemplatesByCategoryPriority = (
  templates: AgentTemplate[],
  categories: string[],
): AgentTemplate[] => {
  if (categories.length === 0) return templates;

  const priority = new Map(categories.map((category, index) => [category, index]));

  return [...templates].sort((a, b) => {
    const aPriority = priority.get(a.category) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = priority.get(b.category) ?? Number.MAX_SAFE_INTEGER;

    return aPriority - bPriority;
  });
};
