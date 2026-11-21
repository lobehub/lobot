'use client';

import { Block, Flexbox, Modal, ScrollArea, Text } from '@lobehub/ui';
import { LayoutGrid } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import NavItem from '@/features/NavPanel/components/NavItem';

import AppsPage from './AppsPage';
import ConnectorDetail from './ConnectorDetail';
import ConnectorIcon from './ConnectorIcon';
import { useMarketModalStore } from './marketModalStore';
import { useMarketConnectors } from './useMarketConnectors';

/** Body of the open dialog, so the connection lists only sync while it shows. */
const MarketBody = memo(() => {
  const { t } = useTranslation('setting');
  const detailId = useMarketModalStore((s) => s.detailId);
  const setDetailId = useMarketModalStore((s) => s.setDetailId);
  const { connectedIds, connectors } = useMarketConnectors();
  const detail = detailId ? connectors.find((connector) => connector.id === detailId) : undefined;
  const connected = connectors.filter((connector) => connectedIds.has(connector.id));

  return (
    <Flexbox horizontal style={{ height: 'min(76vh, 720px)', minHeight: 480 }}>
      <ScrollArea
        disableContentFit
        scrollFade="vertical"
        style={{ flex: 'none', height: '100%', width: 220 }}
      >
        <Flexbox gap={4} paddingBlock={'0 8px'} paddingInline={8}>
          <div style={{ cursor: 'pointer' }} onClick={() => setDetailId(null)}>
            <NavItem active={!detail} icon={LayoutGrid} title={t('market.nav.apps')} />
          </div>
          {connected.length > 0 && (
            <>
              <Text
                fontSize={12}
                style={{ paddingBlock: '12px 4px', paddingInline: 8 }}
                type={'secondary'}
              >
                {t('market.nav.yourApps')}
              </Text>
              {connected.map((connector) => (
                <Block
                  clickable
                  horizontal
                  align={'center'}
                  gap={8}
                  height={36}
                  key={connector.id}
                  paddingInline={8}
                  variant={detailId === connector.id ? 'filled' : 'borderless'}
                  onClick={() => setDetailId(connector.id)}
                >
                  <ConnectorIcon connector={connector} size={20} />
                  <Text ellipsis>{connector.label}</Text>
                </Block>
              ))}
            </>
          )}
        </Flexbox>
      </ScrollArea>
      <ScrollArea
        disableContentFit
        scrollFade="vertical"
        style={{ flex: 1, height: '100%', minWidth: 0 }}
        viewportProps={{ style: { animationName: 'none' } }}
      >
        <div style={{ paddingBlockEnd: 48, paddingInline: 24 }}>
          {detail ? (
            <ConnectorDetail connector={detail} key={detail.id} onBack={() => setDetailId(null)} />
          ) : (
            <AppsPage connectors={connectors} onOpen={setDetailId} />
          )}
        </div>
      </ScrollArea>
    </Flexbox>
  );
});

MarketBody.displayName = 'MarketBody';

/** The Market dialog: browse connectors (Apps), connect them, and manage the connected ones. */
const MarketModal = memo(() => {
  const { t } = useTranslation('setting');
  const open = useMarketModalStore((s) => s.open);
  const closeMarket = useMarketModalStore((s) => s.closeMarket);

  return (
    <Modal
      destroyOnHidden
      draggable={false}
      footer={null}
      open={open}
      styles={{ body: { overflow: 'hidden', padding: 0 } }}
      title={t('market.title')}
      width={'min(92%, 960px)'}
      onCancel={closeMarket}
    >
      {open && <MarketBody />}
    </Modal>
  );
});

MarketModal.displayName = 'MarketModal';

export default MarketModal;
