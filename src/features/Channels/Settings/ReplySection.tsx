import { Flexbox, Select, Switch, Text, toast } from '@lobehub/ui';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AsyncBoundary from '@/components/AsyncBoundary';
import type { ChannelWakeConfig } from '@/services/channel';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';

import { applyWakeForm, toWakeForm, type WakeFormValues } from './wakeForm';

const SELECT_STYLE = { flexShrink: 0, minWidth: 0, width: 104 };

function ReplyForm({ channelId, stored }: { channelId: string; stored: ChannelWakeConfig | null }) {
  const { t } = useTranslation('channel');
  const saved = toWakeForm(stored);
  const [form, setForm] = useState(saved);

  const write = (values: WakeFormValues) =>
    channelActions.updateWakeConfig(channelId, applyWakeForm(stored, values));
  const reportFailure = (error: unknown) => {
    console.error('Failed to save the Channel reply strategy', error);
    toast.error(t('settings.reply.saveFailed'));
  };

  const busyRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const persist = async (patch: Partial<WakeFormValues>) => {
    if (busyRef.current) return;
    const previous = form;
    const next = { ...previous, ...patch };
    if (next.enabled === previous.enabled && next.pace === previous.pace) return;
    busyRef.current = true;
    setSaving(true);
    setForm(next);
    try {
      await write(next);
      toast.success(t('settings.saved'));
    } catch (error) {
      setForm(previous);
      reportFailure(error);
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };

  const paces = (['calm', 'balanced', 'active'] as const).map((value) => ({
    label: t(`settings.reply.pace.${value}`),
    title: t(`settings.reply.paceHint.${value}`),
    value,
  }));
  // Only a strategy tuned by hand can hold it; its numbers are not edited here.
  const options =
    saved.pace === 'custom'
      ? [
          ...paces,
          {
            label: t('settings.reply.pace.custom'),
            title: t('settings.reply.paceHint.custom'),
            value: 'custom' as const,
          },
        ]
      : paces;

  return (
    <Flexbox gap={20} style={{ minWidth: 0 }}>
      <Flexbox horizontal align="center" gap={16} justify="space-between">
        <Flexbox flex={1} gap={4} style={{ minWidth: 0 }}>
          <Text weight={400}>{t('settings.reply.enabled')}</Text>
          <Text fontSize={12} type="secondary">
            {t('settings.reply.enabledHint')}
          </Text>
        </Flexbox>
        <Switch
          aria-label={t('settings.reply.enabled')}
          checked={form.enabled}
          disabled={saving}
          style={{ flexShrink: 0 }}
          onChange={(enabled) => void persist({ enabled })}
        />
      </Flexbox>
      {form.enabled && (
        <Flexbox horizontal align="center" gap={12} style={{ minWidth: 0 }}>
          <Flexbox flex={1} gap={4} style={{ minWidth: 0 }}>
            <Text weight={400}>{t('settings.reply.section.pace')}</Text>
            <Text fontSize={12} type="secondary">
              {t('settings.reply.section.paceDesc')}
            </Text>
          </Flexbox>
          <Select
            aria-label={t('settings.reply.section.pace')}
            disabled={saving}
            options={options}
            popupMatchSelectWidth={false}
            style={SELECT_STYLE}
            value={form.pace}
            onChange={(pace) => void persist({ pace })}
          />
        </Flexbox>
      )}
    </Flexbox>
  );
}

export function ReplySection({ channelId }: { channelId: string }) {
  const { error, revalidate } = channelActions.useFetchWakeConfig(channelId);
  const data = useChannelStore(channelSelectors.wakeConfig(channelId));

  return (
    <AsyncBoundary
      data={data}
      error={error}
      isLoading={data === undefined && !error}
      onRetry={() => {
        void revalidate();
      }}
    >
      {data && (
        <ReplyForm channelId={channelId} stored={data.channel as ChannelWakeConfig | null} />
      )}
    </AsyncBoundary>
  );
}
