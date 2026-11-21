import { ActionIcon, Button, Flexbox, Icon, Tag, Text } from '@lobehub/ui';
import { ChevronLeft, Unplug } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MarketConnector } from './catalog';
import ConnectAction from './ConnectAction';
import ConnectorIcon from './ConnectorIcon';
import { formatConnectorActionError } from './formatConnectorActionError';
import { useConnectorAuth } from './useConnectorAuth';

/** A connector's own page: what it does, who makes it, and connect / disconnect. */
const ConnectorDetail = memo<{ connector: MarketConnector; onBack: () => void }>(
  ({ connector, onBack }) => {
    const { t } = useTranslation('setting');
    const auth = useConnectorAuth(connector);

    return (
      <Flexbox gap={24}>
        <ActionIcon icon={ChevronLeft} size={'small'} title={t('market.back')} onClick={onBack} />
        <Flexbox horizontal align={'center'} gap={16}>
          <ConnectorIcon connector={connector} size={56} />
          <Flexbox flex={1} gap={4} style={{ minWidth: 0 }}>
            <Flexbox horizontal align={'center'} gap={8}>
              <Text fontSize={18} weight={600}>
                {connector.label}
              </Text>
              {auth.connected && (
                <Tag color={'success'} size={'small'}>
                  {t('tools.lobehubSkill.connected')}
                </Tag>
              )}
            </Flexbox>
            <Text ellipsis type={'secondary'}>
              {connector.description}
            </Text>
          </Flexbox>
          {auth.connected ? (
            <Button icon={<Icon icon={Unplug} />} onClick={auth.disconnect}>
              {t('tools.lobehubSkill.disconnect')}
            </Button>
          ) : (
            <ConnectAction auth={auth} />
          )}
        </Flexbox>
        {auth.error && (
          <Text type={'danger'}>{formatConnectorActionError(t, auth.error, connector.label)}</Text>
        )}
        <Flexbox gap={8}>
          <Text weight={600}>{t('market.detail.about')}</Text>
          <Text style={{ lineHeight: 1.7 }} type={'secondary'}>
            {connector.readme}
          </Text>
        </Flexbox>
        <Flexbox gap={8}>
          <Text weight={600}>{t('market.detail.developer')}</Text>
          {connector.authorUrl ? (
            <a href={connector.authorUrl} rel={'noreferrer'} target={'_blank'}>
              {connector.author}
            </a>
          ) : (
            <Text type={'secondary'}>{connector.author}</Text>
          )}
        </Flexbox>
      </Flexbox>
    );
  },
);

ConnectorDetail.displayName = 'MarketConnectorDetail';

export default ConnectorDetail;
