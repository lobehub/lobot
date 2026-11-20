import { Flexbox, Icon, Text } from '@lobehub/ui';
import { Gauge, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openPlans } from './links';
import { canUpgrade, headlineUsage } from './quota';
import { useFetchPersonalSubscription, usePersonalSubscription, useUsageAvailable } from './store';

/**
 * The account menu's usage rows, above Settings: the headline figure (weekly on a rolling plan,
 * monthly on Free and Basic), which opens the Usage & billing page, and an upgrade below the top
 * plan. Nothing outside the personal space of a LobeHub Cloud account, or before the plan loads.
 */
export const useUsageMenuItems = (onOpenUsage: () => void) => {
  const { t } = useTranslation('subscription');
  useFetchPersonalSubscription();
  const available = useUsageAvailable();
  const subscription = usePersonalSubscription();

  return useMemo(() => {
    if (!available || !subscription) return [];
    const headline = headlineUsage(subscription);

    return [
      headline && {
        icon: <Icon icon={Gauge} />,
        key: 'usage',
        label: (
          <Flexbox horizontal align={'center'} gap={16} justify={'space-between'}>
            <span>{t(`usageBilling.menu.${headline.period}`)}</span>
            <Text fontSize={12} type={'secondary'}>
              {t('usageBilling.window.used', { percent: headline.percentUsed })}
            </Text>
          </Flexbox>
        ),
        onClick: onOpenUsage,
      },
      canUpgrade(subscription) && {
        icon: <Icon icon={Sparkles} />,
        key: 'upgrade',
        label: t('usageBilling.plan.upgrade'),
        onClick: openPlans,
      },
    ].filter((item) => !!item);
  }, [available, onOpenUsage, subscription, t]);
};
