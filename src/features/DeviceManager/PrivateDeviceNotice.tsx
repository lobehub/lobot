import { Alert, Button } from '@lobehub/ui';
import type { DeviceListItem } from '@lobot/types';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { deviceSettingsUrl } from './deviceVisibility';

/** Opens device settings in the LobeHub web app, where a device's visibility is set. */
export const DeviceSettingsLink = ({ href }: { href: string }) => {
  const { t } = useTranslation('device');
  return (
    <Button
      href={href}
      icon={ExternalLink}
      rel="noopener noreferrer"
      size="small"
      style={{ flexShrink: 0 }}
      target="_blank"
    >
      {t('visibility.private.openSettings')}
    </Button>
  );
};

export const PrivateDeviceSettingsLink = ({ device }: { device: DeviceListItem }) => (
  <DeviceSettingsLink href={deviceSettingsUrl(device)} />
);

/**
 * Agents bound to a private workspace device run only for its enroller. Says so where an Agent
 * is put on that device, with a link to the device's page in LobeHub, where its visibility is set.
 */
export const PrivateDeviceNotice = ({ device, name }: { device: DeviceListItem; name: string }) => {
  const { t } = useTranslation('device');
  return (
    <Alert
      showIcon
      action={<PrivateDeviceSettingsLink device={device} />}
      title={t('visibility.private.notice', { name })}
      type="info"
    />
  );
};
