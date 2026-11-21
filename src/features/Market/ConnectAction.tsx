import { Button, Flexbox, Icon, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import { Check, PlusIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { useConnectorAuth } from './useConnectorAuth';

/** "+ Connect", or a green check once connected. */
const ConnectAction = memo<{ auth: ReturnType<typeof useConnectorAuth> }>(({ auth }) => {
  const { t } = useTranslation('setting');

  if (auth.connected)
    return (
      <Flexbox horizontal align={'center'} gap={6} paddingInline={8}>
        <Icon color={cssVar.colorSuccess} icon={Check} size={14} />
        <Text type={'secondary'}>{t('tools.lobehubSkill.connected')}</Text>
      </Flexbox>
    );

  return (
    <Button
      icon={<Icon icon={PlusIcon} />}
      loading={auth.pending}
      onClick={(event) => {
        event.stopPropagation();
        void auth.connect();
      }}
    >
      {t('tools.lobehubSkill.connect')}
    </Button>
  );
});

ConnectAction.displayName = 'MarketConnectAction';

export default ConnectAction;
