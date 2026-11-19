import { type GatewayConnectionErrorCode, useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { ActionIcon, Button, Flexbox, Popover } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { HardDrive, SettingsIcon } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { openSettingsFromUrl } from '@/features/NavRail/settingsPopupStore';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useElectronStore } from '@/store/electron';
import { electronSyncSelectors } from '@/store/electron/selectors';

/**
 * How long the device must stay off the gateway before the titlebar says so.
 * Launch starts disconnected and the main process reconnects on its own, so a
 * shorter outage resolves before anyone needs to know.
 */
export const OFFLINE_HINT_DELAY_MS = 8000;

/** Why the last attempt ended, phrased with the next step. */
const ERROR_MESSAGE_KEYS = {
  auth_failed: 'gateway.error.authRejected',
  config_unavailable: 'gateway.error.configUnavailable',
  invalid_gateway_url: 'gateway.error.invalidAddress',
  not_signed_in: 'gateway.error.notSignedIn',
} as const satisfies Record<GatewayConnectionErrorCode, string>;

const styles = stylex.create({
  errorDot: {
    position: 'absolute',
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    width: '8px',
    height: '8px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '50%',
    backgroundColor: cssVar.colorError,
  },
  errorHint: {
    fontSize: '12px',
    lineHeight: 1.5,
    color: cssVar.colorError,
  },
  hint: {
    fontSize: '11px',
    lineHeight: 1.4,
    color: cssVar.colorTextDescription,
  },
  popover: {
    width: '250px',
  },
  title: {
    fontSize: '13px',
    fontWeight: 500,
    color: cssVar.colorText,
  },
});

/**
 * Lobot keeps this device on the gateway by itself, so the titlebar stays
 * silent while it is online and only shows an offline mark once a drop lasts,
 * with the reason and a manual retry.
 */
const DeviceGatewayOffline = memo(() => {
  const { t } = useTranslation('electron');
  const navigate = useWorkspaceAwareNavigate();
  const status = useElectronStore((s) => s.gatewayConnectionStatus);
  const error = useElectronStore((s) => s.gatewayConnectionError);
  const connectGateway = useElectronStore((s) => s.connectGateway);
  const setGatewayConnectionState = useElectronStore((s) => s.setGatewayConnectionState);

  useElectronStore((s) => s.useFetchGatewayStatus)();
  useWatchBroadcast('gatewayConnectionStatusChanged', setGatewayConnectionState);

  // Keyed on "connected" alone: the automatic retries pass through `connecting`,
  // and the mark must not blink with every attempt while the device stays offline.
  const connected = status === 'connected';
  const [offlineLasted, setOfflineLasted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (connected) return;
    const timer = setTimeout(() => setOfflineLasted(true), OFFLINE_HINT_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setOfflineLasted(false);
      setOpen(false);
    };
  }, [connected]);

  if (connected || !offlineLasted) return null;

  const failure = status === 'disconnected' ? error : undefined;
  const canRetry = failure?.code !== 'not_signed_in' && failure?.code !== 'invalid_gateway_url';

  const openDeviceSettings = () => {
    setOpen(false);
    if (!openSettingsFromUrl('/settings/devices')) navigate('/settings/devices');
  };

  const content = (
    <Flexbox gap={4} {...stylex.props(styles.popover)}>
      <Flexbox horizontal align={'center'} justify={'space-between'}>
        <span {...stylex.props(styles.title)}>{t('gateway.title')}</span>
        <ActionIcon
          aria-label={t('gateway.manageDevices')}
          icon={SettingsIcon}
          size={'small'}
          title={t('gateway.manageDevices')}
          onClick={openDeviceSettings}
        />
      </Flexbox>
      <span {...stylex.props(styles.hint)}>
        {t(status === 'disconnected' ? 'gateway.statusDisconnected' : 'gateway.statusConnecting')}
      </span>
      {failure && (
        <span title={failure.detail} {...stylex.props(styles.errorHint)}>
          {t(ERROR_MESSAGE_KEYS[failure.code])}
        </span>
      )}
      {status === 'disconnected' && canRetry && (
        <Flexbox horizontal>
          <Button outdent size={'small'} type={'text'} onClick={() => void connectGateway()}>
            {t('gateway.retry')}
          </Button>
        </Flexbox>
      )}
    </Flexbox>
  );

  return (
    <Popover
      arrow={false}
      content={content}
      open={open}
      placement={'bottomRight'}
      styles={{ content: { padding: 8 } }}
      trigger={'click'}
      onOpenChange={setOpen}
    >
      <div style={{ position: 'relative' }}>
        <ActionIcon
          aria-label={t('gateway.statusDisconnected')}
          icon={HardDrive}
          size={'small'}
          title={t('gateway.statusDisconnected')}
          tooltipProps={{ placement: 'bottomRight' }}
        />
        <span {...stylex.props(styles.errorDot)} />
      </div>
    </Popover>
  );
});

DeviceGatewayOffline.displayName = 'DeviceGatewayOffline';

const DeviceGateway = memo(() => {
  const isSyncActive = useElectronStore(electronSyncSelectors.isSyncActive);

  if (!isSyncActive) return null;

  return <DeviceGatewayOffline />;
});

DeviceGateway.displayName = 'DeviceGateway';

export default DeviceGateway;
