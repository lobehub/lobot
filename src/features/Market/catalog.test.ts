import { getConnectorCatalog } from '@lobechat/const';
import { describe, expect, it } from 'vitest';

import {
  groupConnectors,
  MARKET_CATEGORIES,
  type MarketConnector,
  matchConnector,
  toMarketConnector,
} from './catalog';

const catalog = getConnectorCatalog({ composio: true, lobehub: true }).map(toMarketConnector);
const byId = (id: string) => catalog.find((connector) => connector.id === id) as MarketConnector;

describe('Market catalog', () => {
  it('flattens both sources to one shape keyed by the unqualified id', () => {
    expect(byId('github')).toMatchObject({ category: 'development', label: 'GitHub' });
    expect(byId('github').source.type).toBe('lobehub');
    expect(byId('slack')).toMatchObject({ category: 'productivity', label: 'Slack' });
    expect(byId('slack').source.type).toBe('composio');
  });

  it('lists every identifier once', () => {
    const ids = catalog.map((connector) => connector.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('matches the name or the description, ignoring case and spaces', () => {
    expect(matchConnector(byId('github'), '  GITHUB ')).toBe(true);
    expect(matchConnector(byId('github'), 'version control')).toBe(true);
    expect(matchConnector(byId('github'), 'spreadsheet')).toBe(false);
    expect(matchConnector(byId('github'), '')).toBe(true);
  });

  it('groups in category order and drops empty categories', () => {
    const groups = groupConnectors([byId('twitter'), byId('slack')]);
    expect(groups.map((group) => group.category)).toEqual(['productivity', 'social']);
    expect(
      groupConnectors(catalog).every((group) => MARKET_CATEGORIES.includes(group.category)),
    ).toBe(true);
  });
});
