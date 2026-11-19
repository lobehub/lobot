import { Flexbox, Input, Text, toast } from '@lobehub/ui';
import type { ChannelListItem } from '@lobot/types';
import { CHANNEL_LIMITS } from '@lobot/types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { channelActions } from '@/store/channel';
import { isTrpcErrorCode } from '@/utils/trpcError';

export function GeneralSection({ channel }: { channel: ChannelListItem }) {
  const { t } = useTranslation('channel');
  const [title, setTitle] = useState(channel.title);
  const [saving, setSaving] = useState(false);
  const committedRef = useRef(channel.title);
  const busyRef = useRef(false);
  const composingRef = useRef(false);
  const archived = channel.status === 'archived';

  const commit = async () => {
    const next = title.trim();
    if (archived || busyRef.current || composingRef.current) return;
    if (!next) {
      setTitle(committedRef.current);
      return;
    }
    if (next === committedRef.current) {
      if (title !== next) setTitle(next);
      return;
    }

    busyRef.current = true;
    setSaving(true);
    try {
      await channelActions.rename(channel.id, next);
      committedRef.current = next;
      setTitle(next);
      toast.success(t('settings.saved'));
    } catch (error) {
      console.error('Failed to rename Channel', error);
      toast.error(t(isTrpcErrorCode(error, 'FORBIDDEN') ? 'renameForbidden' : 'renameFailed'));
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      <Flexbox gap={2}>
        <Text weight={400}>{t('settings.general.name')}</Text>
      </Flexbox>
      <Input
        aria-label={t('settings.general.name')}
        disabled={archived}
        maxLength={CHANNEL_LIMITS.titleLength}
        readOnly={saving}
        style={{ width: '100%' }}
        value={title}
        onBlur={() => void commit()}
        onChange={(event) => setTitle(event.target.value)}
        onCompositionEnd={() => {
          composingRef.current = false;
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onPressEnter={(event) => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          void commit();
        }}
      />
    </Flexbox>
  );
}
