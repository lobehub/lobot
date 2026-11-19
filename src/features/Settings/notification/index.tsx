import {
  COMPLETION_BUILTIN_SOUNDS,
  type CompletionSoundSettings,
} from '@lobechat/electron-client-ipc';
import { Alert, Button, Flexbox, Select, Slider, Switch } from '@lobehub/ui';
import { useForm } from '@lobehub/ui/form';
import { Play } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NotificationSoundsSkeleton } from '@/components/Skeleton/Settings/tabs/Notification';
import { FORM_STYLE } from '@/const/layoutTokens';
import type { ChannelNotificationLevel } from '@/features/Channels/notifications/activity';
import SettingsForm from '@/features/Settings/features/SettingsForm';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { completionSoundService } from '@/services/electron/completionSound';
import { desktopNotificationService } from '@/services/electron/desktopNotification';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';

const IMPORTED = 'imported';
const IMPORT = 'import';

// Keep the last successful load so switching away from this tab and back
// does not flash the skeleton while getSettings resolves again.
let cachedSettings: CompletionSoundSettings | undefined;

export const DesktopNotificationSettings = () => {
  const { t } = useTranslation('setting');
  const soundToggleId = useId();
  const [settings, setSettings] = useState<CompletionSoundSettings | undefined>(cachedSettings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const form = useForm();
  const channelLevel = useGlobalStore(systemStatusSelectors.channelNotificationLevel);
  const updateSystemStatus = useGlobalStore((s) => s.updateSystemStatus);

  const report = useCallback(async (action: () => Promise<CompletionSoundSettings | void>) => {
    setError(false);
    try {
      const next = await action();
      if (next) {
        cachedSettings = next;
        setSettings(next);
      }
    } catch (error) {
      console.error('Completion sound setting failed:', error);
      setError(true);
    }
  }, []);

  /** Only state-changing actions lock the form; playing a sound changes nothing. */
  const run = async (action: () => Promise<CompletionSoundSettings | void>) => {
    setBusy(true);
    try {
      await report(action);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void report(completionSoundService.getSettings);
  }, [report]);

  const previewBanner = () =>
    report(async () => {
      const result = await desktopNotificationService.showNotification({
        body: t('completionSound.banner.previewBody'),
        // Settings is open, so the window has focus and the banner would be skipped.
        force: true,
        soundName: await completionSoundService.getNotificationSoundFile(),
        title: t('completionSound.banner.previewTitle'),
      });
      // A refused banner resolves instead of throwing, so an undelivered preview would
      // otherwise look like a dead button.
      if (!result?.success) throw new Error(result?.error ?? result?.reason ?? 'not delivered');
    });

  return (
    <Flexbox gap={20}>
      {error && (
        <Alert
          description={t('completionSound.error')}
          type={'error'}
          action={
            <Button type="fill" onClick={() => run(completionSoundService.getSettings)}>
              {t('completionSound.retry')}
            </Button>
          }
        />
      )}
      <SettingsForm
        collapsible={false}
        form={form}
        itemMinWidth={FORM_STYLE.itemMinWidth}
        itemsType={'group'}
        style={FORM_STYLE.style}
        variant={'borderless'}
        items={[
          {
            children: [
              {
                children: (
                  <Select
                    value={channelLevel}
                    options={[
                      { label: t('channelNotification.level.all'), value: 'all' },
                      { label: t('channelNotification.level.mentions'), value: 'mentions' },
                      { label: t('channelNotification.level.off'), value: 'off' },
                    ]}
                    onChange={(channelNotificationLevel) =>
                      updateSystemStatus({
                        channelNotificationLevel:
                          channelNotificationLevel as ChannelNotificationLevel,
                      })
                    }
                  />
                ),
                desc: t(`channelNotification.desc.${channelLevel}`),
                label: (
                  <SettingsSearchAnchor id={'notification-channel-messages'}>
                    {t('channelNotification.label')}
                  </SettingsSearchAnchor>
                ),
              },
            ],
            title: t('channelNotification.title'),
          },
          ...(settings
            ? [
                {
                  children: [
                    {
                      children: (
                        <Switch
                          checked={settings.enabled}
                          disabled={busy}
                          id={soundToggleId}
                          style={{ alignSelf: 'flex-end' }}
                          onChange={(enabled) =>
                            run(() => completionSoundService.setSettings({ enabled }))
                          }
                        />
                      ),
                      desc: t('completionSound.desc'),
                      label: (
                        <SettingsSearchAnchor id={'notification-completion-sound'}>
                          {t('completionSound.enabled')}
                        </SettingsSearchAnchor>
                      ),
                    },
                    {
                      children: (
                        <Flexbox
                          horizontal
                          align={'center'}
                          gap={8}
                          justify={'flex-end'}
                          width={'100%'}
                        >
                          <Select
                            disabled={busy}
                            style={{ flex: 1, minWidth: 0 }}
                            value={settings.name ? IMPORTED : settings.builtin}
                            options={[
                              ...(settings.name ? [{ label: settings.name, value: IMPORTED }] : []),
                              ...COMPLETION_BUILTIN_SOUNDS.map((value) => ({
                                label: t(`completionSound.builtin.${value}`),
                                value,
                              })),
                              { label: t('completionSound.import'), value: IMPORT },
                            ]}
                            onChange={(value) => {
                              if (value === IMPORT) return run(completionSoundService.importSound);
                              const builtin = COMPLETION_BUILTIN_SOUNDS.find((id) => id === value);
                              if (builtin)
                                run(() => completionSoundService.setSettings({ builtin }));
                            }}
                          />
                          <Button
                            disabled={settings.volume === 0}
                            icon={Play}
                            style={{ flex: 'none' }}
                            title={t('completionSound.preview')}
                            type="fill"
                            onClick={() =>
                              report(() => completionSoundService.play({ preview: true }))
                            }
                          />
                        </Flexbox>
                      ),
                      desc: t('completionSound.importHint'),
                      label: t('completionSound.sound'),
                    },
                    {
                      children: (
                        <div style={{ minWidth: 120, width: '100%' }}>
                          <Slider
                            aria-label={t('completionSound.volume')}
                            disabled={busy}
                            max={1}
                            min={0}
                            step={0.1}
                            style={{ width: '100%' }}
                            value={settings.volume}
                            onChange={(volume) => setSettings({ ...settings, volume })}
                            onChangeComplete={(volume) =>
                              run(() => completionSoundService.setSettings({ volume }))
                            }
                          />
                        </div>
                      ),
                      label: t('completionSound.volume'),
                    },
                  ],
                  title: t('completionSound.title'),
                },
                {
                  children: [
                    {
                      children: (
                        <Flexbox
                          horizontal
                          align={'center'}
                          gap={8}
                          justify={'flex-end'}
                          width={'100%'}
                        >
                          <Select
                            disabled={busy}
                            style={{ flex: 1, minWidth: 0 }}
                            value={settings.notificationSound}
                            options={[
                              { label: t('completionSound.banner.system'), value: 'system' },
                              { label: t('completionSound.banner.lobehub'), value: 'lobehub' },
                            ]}
                            onChange={(notificationSound) =>
                              run(() =>
                                completionSoundService.setSettings({
                                  notificationSound:
                                    notificationSound as CompletionSoundSettings['notificationSound'],
                                }),
                              )
                            }
                          />
                          <Button
                            icon={Play}
                            style={{ flex: 'none' }}
                            title={t('completionSound.preview')}
                            type="fill"
                            onClick={previewBanner}
                          />
                        </Flexbox>
                      ),
                      desc: settings.systemSoundDisabled
                        ? t('completionSound.banner.systemMuted')
                        : t('completionSound.banner.desc'),
                      label: (
                        <SettingsSearchAnchor id={'notification-banner-sound'}>
                          {t('completionSound.banner.label')}
                        </SettingsSearchAnchor>
                      ),
                    },
                  ],
                  title: t('completionSound.banner.title'),
                },
              ]
            : []),
        ]}
      />
      {!settings && !error && <NotificationSoundsSkeleton />}
    </Flexbox>
  );
};
