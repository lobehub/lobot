import { Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MarketConnector } from './catalog';
import ConnectAction from './ConnectAction';
import ConnectorIcon from './ConnectorIcon';
import { formatConnectorActionError } from './formatConnectorActionError';
import { useConnectorAuth } from './useConnectorAuth';

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBlock: 8,
    paddingInline: 8,
    borderRadius: cssVar.borderRadiusLG,
    cursor: 'pointer',
    backgroundColor: {
      'default': 'transparent',
      ':hover': cssVar.colorFillQuaternary,
    },
  },
  text: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minWidth: 0,
  },
});

/** One catalog row: logo, name and blurb, with Connect on the right. */
const ConnectorRow = memo<{ connector: MarketConnector; onOpen: () => void }>(
  ({ connector, onOpen }) => {
    const { t } = useTranslation('setting');
    const auth = useConnectorAuth(connector);

    return (
      <div {...stylex.props(styles.row)} onClick={onOpen}>
        <ConnectorIcon connector={connector} size={40} />
        <span {...stylex.props(styles.text)}>
          <Text ellipsis weight={500}>
            {connector.label}
          </Text>
          {auth.error ? (
            <Text ellipsis fontSize={12} type={'danger'}>
              {formatConnectorActionError(t, auth.error, connector.label)}
            </Text>
          ) : (
            <Text ellipsis fontSize={12} type={'secondary'}>
              {connector.description}
            </Text>
          )}
        </span>
        <ConnectAction auth={auth} />
      </div>
    );
  },
);

ConnectorRow.displayName = 'MarketConnectorRow';

export default ConnectorRow;
