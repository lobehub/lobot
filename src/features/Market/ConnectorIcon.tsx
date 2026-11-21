import { Avatar, Center, Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { memo } from 'react';

import type { MarketConnector } from './catalog';

const styles = stylex.create({
  tile: {
    flex: 'none',
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: cssVar.colorFillSecondary,
    backgroundColor: cssVar.colorBgContainer,
  },
  radius: (size: number) => ({ borderRadius: Math.round(size * 0.25) }),
});

/** The connector's logo on a rounded tile, like an app icon. */
const ConnectorIcon = memo<{ connector: MarketConnector; size: number }>(({ connector, size }) => {
  const { icon, label } = connector;
  const glyph = Math.round(size * 0.6);

  return (
    <Center height={size} width={size} {...stylex.props(styles.tile, styles.radius(size))}>
      {typeof icon === 'string' ? (
        <Avatar alt={label} avatar={icon} shape={'square'} size={glyph} />
      ) : (
        <Icon fill={cssVar.colorText} icon={icon} size={glyph} />
      )}
    </Center>
  );
});

ConnectorIcon.displayName = 'MarketConnectorIcon';

export default ConnectorIcon;
