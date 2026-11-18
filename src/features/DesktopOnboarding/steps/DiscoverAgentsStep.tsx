'use client';

import type { HeterogeneousAgentType } from '@lobechat/heterogeneous-agents';
import { Block, Button, Checkbox, cssVar, Flexbox, Text } from '@lobehub/ui';
import { Undo2Icon } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type DiscoveredAgent,
  discoverLocalAgents,
  importDiscoveredAgents,
  markAgentTypesDiscovered,
} from '@/features/ConnectAgent/discovery';

import LobeMessage from '../components/LobeMessage';
import OnboardingFooterActions from '../components/OnboardingFooterActions';

interface DiscoverAgentsStepProps {
  onBack: () => void;
  onNext: () => void;
}

/**
 * Last onboarding screen: scan this machine for installed agent CLIs and
 * import the picked ones. Each imported agent comes with its private Channel.
 */
const DiscoverAgentsStep = memo<DiscoverAgentsStepProps>(({ onBack, onNext }) => {
  const { t } = useTranslation('desktop-onboarding');
  const [found, setFound] = useState<DiscoveredAgent[] | null>(null);
  const [selected, setSelected] = useState<HeterogeneousAgentType[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    discoverLocalAgents()
      .then((agents) => {
        if (!mounted) return;
        setFound(agents);
        setSelected(agents.map((agent) => agent.provider.type));
      })
      .catch((error) => {
        console.error('[DesktopOnboarding] Agent discovery failed:', error);
        if (mounted) setFound([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback((type: HeterogeneousAgentType) => {
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  }, []);

  const finish = useCallback(async () => {
    const agents = found ?? [];
    const picked = agents.filter((agent) => selected.includes(agent.provider.type));
    if (picked.length > 0) {
      setImporting(true);
      try {
        await importDiscoveredAgents(picked.map((agent) => agent.provider));
      } finally {
        setImporting(false);
      }
    }
    // Unpicked ones were declined here; the launch prompt should not re-offer them.
    markAgentTypesDiscovered(agents.map((agent) => agent.provider.type));
    onNext();
  }, [found, onNext, selected]);

  const scanning = found === null;

  return (
    <Flexbox gap={16} style={{ height: '100%', minHeight: '100%' }}>
      <Flexbox>
        <LobeMessage sentences={[t('discoverAgents.title'), t('discoverAgents.title2')]} />
        <Text as={'p'}>{t('discoverAgents.description')}</Text>
      </Flexbox>
      <Flexbox gap={8} style={{ width: '100%' }}>
        {scanning ? (
          <Text type={'secondary'}>{t('discoverAgents.scanning')}</Text>
        ) : found.length === 0 ? (
          <Text type={'secondary'}>{t('discoverAgents.empty')}</Text>
        ) : (
          found.map(({ provider, version }) => {
            const checked = selected.includes(provider.type);
            return (
              <Block
                clickable
                horizontal
                align={'center'}
                gap={12}
                key={provider.type}
                padding={12}
                style={{ borderColor: checked ? cssVar.colorSuccess : undefined }}
                variant={'outlined'}
                onClick={() => toggle(provider.type)}
              >
                <provider.brand.Avatar size={32} />
                <Flexbox flex={1} gap={1} style={{ minWidth: 0 }}>
                  <Text strong>{provider.title}</Text>
                  {version && (
                    <Text ellipsis fontSize={12} type={'secondary'}>
                      {version}
                    </Text>
                  )}
                </Flexbox>
                <Checkbox checked={checked} style={{ pointerEvents: 'none' }} />
              </Block>
            );
          })
        )}
      </Flexbox>
      <Text color={cssVar.colorTextSecondary} fontSize={12} style={{ marginTop: 16 }}>
        {t('discoverAgents.footerNote')}
      </Text>
      <OnboardingFooterActions
        left={
          <Button
            disabled={importing}
            icon={Undo2Icon}
            style={{ color: cssVar.colorTextDescription }}
            type={'text'}
            onClick={onBack}
          >
            {t('back')}
          </Button>
        }
        right={
          <Button disabled={scanning} loading={importing} type={'primary'} onClick={finish}>
            {selected.length > 0
              ? t('discoverAgents.import', { count: selected.length })
              : t('discoverAgents.skip')}
          </Button>
        }
      />
    </Flexbox>
  );
});

DiscoverAgentsStep.displayName = 'DiscoverAgentsStep';

export default DiscoverAgentsStep;
