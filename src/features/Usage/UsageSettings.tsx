'use client';

import { Button, Flexbox, Progress, Text } from '@lobehub/ui';
import { type FormGroupItem, useForm } from '@lobehub/ui/form';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import SettingHeader from '@/features/Settings/features/SettingHeader';
import SettingsForm from '@/features/Settings/features/SettingsForm';

import { openBilling, openPlans, openUsageSettings } from './links';
import { canUpgrade, planResetAt, usageWindows } from './quota';
import { useFetchPersonalSubscription, usePersonalSubscription } from './store';
import type { PersonalSubscription } from './types';
import { useFormatResetDate, useResetLabel } from './useResetLabel';

const formatUsd = (amount: number) => `$${amount.toFixed(2)}`;

const UsageBar = ({ percent }: { percent: number }) => {
  const { t } = useTranslation('subscription');
  return (
    <Flexbox horizontal align={'center'} gap={12} style={{ minWidth: 200 }}>
      <Progress percent={percent} showInfo={false} size={'small'} style={{ flex: 1, margin: 0 }} />
      <Text style={{ flex: 'none' }} type={'secondary'}>
        {t('usageBilling.window.used', { percent })}
      </Text>
    </Flexbox>
  );
};

const UsageForm = memo<{ subscription: PersonalSubscription }>(({ subscription }) => {
  const { t } = useTranslation('subscription');
  const form = useForm();
  const resetLabel = useResetLabel();
  const formatDate = useFormatResetDate();
  const resetAt = planResetAt(subscription);
  const windows = usageWindows(subscription);
  const overflow = subscription.usage?.quota?.overflow;
  const planName = t(`plans.plan.${subscription.plan}.title`, { defaultValue: subscription.plan });

  const plan: FormGroupItem = {
    children: [
      {
        children: (
          <Flexbox horizontal gap={8}>
            <Button size={'small'} onClick={openBilling}>
              {t('usageBilling.plan.manageBilling')}
            </Button>
            {canUpgrade(subscription) && (
              <Button size={'small'} type={'primary'} onClick={openPlans}>
                {t('usageBilling.plan.upgrade')}
              </Button>
            )}
          </Flexbox>
        ),
        desc:
          resetAt &&
          t(
            subscription.cancelAtPeriodEnd
              ? 'usageBilling.plan.endsOn'
              : 'usageBilling.plan.resetsOn',
            {
              date: formatDate(resetAt),
            },
          ),
        label: planName,
        minWidth: undefined,
      },
    ],
    key: 'plan',
    title: t('usageBilling.plan.title'),
  };

  // A legacy plan meters no shares, so it lists no limits.
  const limits: FormGroupItem | undefined = windows.length
    ? {
        children: windows.map((window) => ({
          children: <UsageBar percent={window.percentUsed} />,
          desc: resetLabel(window.resetAt),
          label: t(window.labelKey),
          minWidth: undefined,
          name: window.rule,
        })),
        key: 'limits',
        title: t('usageBilling.limits.title'),
      }
    : undefined;

  // Only a rolling plan can spend credits past its limits.
  const extra: FormGroupItem | undefined = overflow && {
    children: [
      {
        children: (
          <Button size={'small'} onClick={openUsageSettings}>
            {t('usageBilling.extra.adjust')}
          </Button>
        ),
        desc: overflow.enabled
          ? overflow.limit === null
            ? t('usage.window.overflow.spent', { spent: formatUsd(overflow.spend) })
            : t('usage.window.overflow.limit', {
                limit: formatUsd(overflow.limit),
                spent: formatUsd(overflow.spend),
              })
          : t('usage.window.overflow.off'),
        label: t('usageBilling.extra.status'),
        minWidth: undefined,
      },
    ],
    key: 'extra',
    title: t('usageBilling.extra.title'),
  };

  return (
    <SettingsForm
      collapsible={false}
      form={form}
      items={[plan, limits, extra].filter((group) => !!group)}
      itemsType={'group'}
      variant={'borderless'}
    />
  );
});

UsageForm.displayName = 'UsageForm';

interface PageProps {
  showSettingHeader?: boolean;
}

/**
 * Usage & billing for the personal plan: the plan and when it resets, each limit as the share
 * used, and the extra usage credits may pay for. Changes are made on the web.
 */
const UsageSettings = ({ showSettingHeader = true }: PageProps) => {
  const { t } = useTranslation('subscription');
  const { error, revalidate } = useFetchPersonalSubscription();
  const subscription = usePersonalSubscription();

  return (
    <>
      {showSettingHeader && <SettingHeader title={t('usageBilling.title')} />}
      {subscription ? (
        <UsageForm subscription={subscription} />
      ) : error ? (
        <Flexbox align={'center'} gap={12} paddingBlock={48}>
          <Text type={'secondary'}>{t('usageBilling.loadFailed')}</Text>
          <Button size={'small'} onClick={() => void revalidate()}>
            {t('usageBilling.retry')}
          </Button>
        </Flexbox>
      ) : subscription === null ? (
        // An account without a subscription record is on Free; the web plans page says the rest.
        <UsageForm subscription={{ plan: 'free', usage: {} }} />
      ) : null}
    </>
  );
};

export default UsageSettings;
