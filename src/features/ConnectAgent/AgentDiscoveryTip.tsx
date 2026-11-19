import { Button } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { importDiscoveredAgents, markAgentTypesDiscovered } from './discovery';
import { clearDiscoveryTip, useDiscoveryTipStore } from './discoveryTipStore';

const styles = stylex.create({
  // Same inline pill as the updater notice, so it never covers page content
  tip: {
    display: 'flex',
    flexShrink: 0,
    gap: '4px',
    alignItems: 'center',
    blockSize: '28px',
    paddingInlineStart: '10px',
    paddingInlineEnd: '4px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBorderSecondary,
    borderRadius: cssVar.borderRadiusLG,
    fontSize: cssVar.fontSizeSM,
    lineHeight: 1,
    color: cssVar.colorText,
    whiteSpace: 'nowrap',
    backgroundColor: cssVar.colorFillQuaternary,
  },
});

/** Title bar tip offering the local agents the launch scan found. */
const AgentDiscoveryTip = memo(() => {
  const { t } = useTranslation('chat');
  const providers = useDiscoveryTipStore((s) => s.providers);
  const [importing, setImporting] = useState(false);

  if (providers.length === 0) return null;

  const types = providers.map((provider) => provider.type);
  const names = providers.map((provider) => provider.title).join(', ');

  return (
    <div {...stylex.props(styles.tip)}>
      <span>{t('connectAgent.discovery.tip', { names })}</span>
      <Button
        size={'small'}
        type={'text'}
        onClick={() => {
          markAgentTypesDiscovered(types);
          clearDiscoveryTip();
        }}
      >
        {t('connectAgent.discovery.ignore')}
      </Button>
      <Button
        loading={importing}
        size={'small'}
        type={'primary'}
        onClick={async () => {
          setImporting(true);
          markAgentTypesDiscovered(types);
          await importDiscoveredAgents(providers);
          setImporting(false);
          clearDiscoveryTip();
        }}
      >
        {t('connectAgent.discovery.import')}
      </Button>
    </div>
  );
});

export default AgentDiscoveryTip;
