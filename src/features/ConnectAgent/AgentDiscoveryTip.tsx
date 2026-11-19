import { ActionIcon, Button, Flexbox, Popover } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { BotIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { importDiscoveredAgents, markAgentTypesDiscovered } from './discovery';
import { clearDiscoveryTip, useDiscoveryTipStore } from './discoveryTipStore';

const styles = stylex.create({
  dot: {
    position: 'absolute',
    insetBlockStart: 0,
    insetInlineEnd: 0,
    width: '8px',
    height: '8px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBgContainer,
    borderRadius: '50%',
    backgroundColor: cssVar.colorPrimary,
    pointerEvents: 'none',
  },
  hint: {
    fontSize: '12px',
    lineHeight: 1.5,
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
 * Title bar mark for the local agents the launch scan found: just an icon with
 * a dot, the names and the import / ignore choice live in its popover.
 */
const AgentDiscoveryTip = memo(() => {
  const { t } = useTranslation('chat');
  const providers = useDiscoveryTipStore((s) => s.providers);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  if (providers.length === 0) return null;

  const types = providers.map((provider) => provider.type);
  const names = providers.map((provider) => provider.title).join(', ');
  const title = t('connectAgent.discovery.tip', { names });

  const content = (
    <Flexbox gap={4} {...stylex.props(styles.popover)}>
      <span {...stylex.props(styles.title)}>{title}</span>
      <span {...stylex.props(styles.hint)}>{t('connectAgent.discovery.description')}</span>
      <Flexbox horizontal gap={4} justify={'flex-end'} style={{ marginTop: 4 }}>
        <Button
          size={'small'}
          type={'text'}
          onClick={() => {
            markAgentTypesDiscovered(types);
            setOpen(false);
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
            setOpen(false);
            clearDiscoveryTip();
          }}
        >
          {t('connectAgent.discovery.import')}
        </Button>
      </Flexbox>
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
          aria-label={title}
          icon={BotIcon}
          size={'small'}
          title={title}
          tooltipProps={{ placement: 'bottomRight' }}
        />
        <span {...stylex.props(styles.dot)} />
      </div>
    </Popover>
  );
});

export default AgentDiscoveryTip;
