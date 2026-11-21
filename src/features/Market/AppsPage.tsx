import { Center, Flexbox, Icon, SearchBar, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { ChevronRight } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CATEGORY_PREVIEW_COUNT,
  groupConnectors,
  type MarketCategory,
  type MarketConnector,
  matchConnector,
} from './catalog';
import ConnectorRow from './ConnectorRow';

const styles = stylex.create({
  divider: {
    height: 1,
    backgroundColor: cssVar.colorBorderSecondary,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    columnGap: 16,
    rowGap: 4,
  },
  more: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 0,
    borderWidth: 0,
    font: 'inherit',
    fontSize: 13,
    color: {
      'default': cssVar.colorTextTertiary,
      ':hover': cssVar.colorTextSecondary,
    },
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
});

/**
 * The Apps page: a search box over the connector catalog, grouped by category.
 * Rows sit in two columns. A long category shows its first rows and a "View all" link; a search lists
 * every match.
 */
const AppsPage = memo<{ connectors: MarketConnector[]; onOpen: (id: string) => void }>(
  ({ connectors, onOpen }) => {
    const { t } = useTranslation('setting');
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState<Set<MarketCategory>>(() => new Set());
    const searching = query.trim().length > 0;

    const groups = useMemo(
      () => groupConnectors(connectors.filter((connector) => matchConnector(connector, query))),
      [connectors, query],
    );

    const toggle = (category: MarketCategory) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(category)) next.delete(category);
        else next.add(category);
        return next;
      });

    return (
      <Flexbox gap={20}>
        <Flexbox gap={4}>
          <Text fontSize={20} weight={600}>
            {t('market.apps.title')}
          </Text>
          <Text type={'secondary'}>{t('market.apps.desc')}</Text>
        </Flexbox>
        <SearchBar
          allowClear
          placeholder={t('market.apps.search')}
          value={query}
          variant={'filled'}
          onChange={(event) => setQuery(event.target.value)}
        />
        {groups.length === 0 ? (
          <Center paddingBlock={48}>
            <Text type={'secondary'}>{t('market.apps.empty')}</Text>
          </Center>
        ) : (
          groups.map(({ category, items }) => {
            const open = searching || expanded.has(category);
            const visible = open ? items : items.slice(0, CATEGORY_PREVIEW_COUNT);
            const canExpand = !searching && items.length > CATEGORY_PREVIEW_COUNT;

            return (
              <Flexbox gap={8} key={category}>
                <div {...stylex.props(styles.divider)} />
                <Flexbox horizontal align={'center'} justify={'space-between'} paddingBlock={8}>
                  <Flexbox horizontal align={'baseline'} gap={8}>
                    <Text weight={600}>{t(`market.category.${category}`)}</Text>
                    <Text type={'secondary'}>{items.length}</Text>
                  </Flexbox>
                  {canExpand && (
                    <button
                      type={'button'}
                      {...stylex.props(styles.more)}
                      onClick={() => toggle(category)}
                    >
                      {open ? t('market.apps.collapse') : t('market.apps.viewAll')}
                      <Icon icon={ChevronRight} size={14} />
                    </button>
                  )}
                </Flexbox>
                <div {...stylex.props(styles.grid)}>
                  {visible.map((connector) => (
                    <ConnectorRow
                      connector={connector}
                      key={connector.id}
                      onOpen={() => onOpen(connector.id)}
                    />
                  ))}
                </div>
              </Flexbox>
            );
          })
        )}
      </Flexbox>
    );
  },
);

AppsPage.displayName = 'MarketAppsPage';

export default AppsPage;
