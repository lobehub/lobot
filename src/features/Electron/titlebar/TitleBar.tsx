import { TITLE_BAR_HEIGHT } from '@lobechat/desktop-bridge';
import { Divider, Flexbox } from '@lobehub/ui';
import { memo } from 'react';

import { electronStylish } from '@/styles/electron';
import { getPlatform } from '@/utils/platform';

import DeviceGateway from '../connection/DeviceGateway';
import { useWatchThemeUpdate } from '../system/useWatchThemeUpdate';
import { UpdateNotification } from '../updater/UpdateNotification';
import { getTitleBarLayoutConfig } from './layout';
import NavigationBar from './NavigationBar';
import { useMenuPageCommands } from './useMenuPageCommands';
import WinControl from './WinControl';

const platform = getPlatform();

const TitleBar = memo(() => {
  useWatchThemeUpdate();
  useMenuPageCommands();

  const { padding, showCustomWinControl } = getTitleBarLayoutConfig(platform);

  return (
    <Flexbox
      horizontal
      align={'center'}
      className={electronStylish.draggable}
      height={TITLE_BAR_HEIGHT}
      justify={'space-between'}
      style={{ minHeight: TITLE_BAR_HEIGHT, padding, position: 'relative' }}
      width={'100%'}
    >
      <NavigationBar />

      <Flexbox horizontal align={'center'} gap={4}>
        <Flexbox horizontal align={'center'} className={electronStylish.nodrag} gap={8}>
          <UpdateNotification />
          <DeviceGateway />
        </Flexbox>
        {showCustomWinControl && (
          <>
            <Divider orientation={'vertical'} style={{ marginInline: 8 }} />
            <WinControl />
          </>
        )}
      </Flexbox>
    </Flexbox>
  );
});

export default TitleBar;
