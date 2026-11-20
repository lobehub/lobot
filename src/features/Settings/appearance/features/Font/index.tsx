'use client';

import { isDesktop } from '@lobechat/const';
import { Select, Switch } from '@lobehub/ui';
import { type FormGroupItem, useForm } from '@lobehub/ui/form';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AutoSaveHint from '@/components/Editor/AutoSaveHint';
import { FORM_STYLE } from '@/const/layoutTokens';
import SettingsForm from '@/features/Settings/features/SettingsForm';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { useSaveState } from '@/hooks/useSaveState';
import { useUserStore } from '@/store/user';
import { preferenceSelectors, userGeneralSettingsSelectors } from '@/store/user/selectors';

import ChatThemePreview from '../ColorTheme/ChatThemePreview';
import { APPLICATION_DEFAULT_FONT, useSystemFontOptions } from '../useSystemFontOptions';
import FallbackFontList from './FallbackFontList';
import { FontSizeControl } from './FontSize';
import { joinFontStack, parseFontStack } from './fontStack';

const FontSettings = memo(() => {
  const { t } = useTranslation('setting');
  const [fontFamily, monospaceFontFamily] = useUserStore((s) => [
    preferenceSelectors.fontFamily(s),
    preferenceSelectors.terminalFontFamily(s),
  ]);
  const fontAntialiasing = useUserStore(userGeneralSettingsSelectors.fontAntialiasing);
  const fontSize = useUserStore(userGeneralSettingsSelectors.fontSize);
  const updatePreference = useUserStore((s) => s.updatePreference);
  const setSettings = useUserStore((s) => s.setSettings);
  const { status: saveStatus, lastSavedAt, save, retry } = useSaveState();
  const form = useForm();

  const interfaceStack = useMemo(() => parseFontStack(fontFamily), [fontFamily]);
  const monospaceStack = useMemo(() => parseFontStack(monospaceFontFamily), [monospaceFontFamily]);

  const interfaceFonts = useSystemFontOptions({
    defaultLabel: t('settingAppearance.font.fontFamily.default'),
    enabled: isDesktop,
    unavailableLabel: (font) => t('settingAppearance.font.fontFamily.unavailable', { font }),
    values: interfaceStack,
  });
  const monospaceFonts = useSystemFontOptions({
    defaultLabel: t('settingAppearance.font.monospace.default'),
    enabled: isDesktop,
    monospaceOnly: true,
    unavailableLabel: (font) => t('settingAppearance.font.monospace.unavailable', { font }),
    values: monospaceStack,
  });

  const saveInterfaceStack = (stack: string[]) =>
    // lobe-design-ignore LOBE-FONT-FAMILY: preference field name, not a CSS font-family
    save(() => updatePreference({ fontFamily: joinFontStack(stack) }));
  const saveMonospaceStack = (stack: string[]) =>
    save(() => updatePreference({ terminalFontFamily: joinFontStack(stack) }));

  const fontSizeGroup: FormGroupItem = {
    children: (
      <div style={{ minWidth: 0, paddingBlock: 16, width: '100%' }}>
        <ChatThemePreview />
        <div style={{ minWidth: 0, paddingBlockStart: 8, width: '100%' }}>
          <FontSizeControl
            value={fontSize}
            onChange={(value) => setSettings({ general: { fontSize: value } })}
          />
        </div>
      </div>
    ),
    title: (
      <SettingsSearchAnchor id={'appearance-font-size'}>
        {t('settingChatAppearance.fontSize.title')}
      </SettingsSearchAnchor>
    ),
  };

  const font: FormGroupItem = {
    children: [
      ...(isDesktop
        ? [
            {
              children: (
                <Select
                  showSearch
                  aria-label={t('settingAppearance.font.fontFamily.title')}
                  loading={interfaceFonts.isLoading}
                  options={interfaceFonts.options}
                  style={{ width: 320 }}
                  value={interfaceStack[0] || APPLICATION_DEFAULT_FONT}
                  onChange={(value: string) =>
                    saveInterfaceStack(
                      value === APPLICATION_DEFAULT_FONT ? [] : [value, ...interfaceStack.slice(1)],
                    )
                  }
                />
              ),
              desc: interfaceFonts.hasLoadError
                ? t('settingAppearance.font.fontFamily.loadError')
                : t('settingAppearance.font.fontFamily.desc'),
              label: (
                <SettingsSearchAnchor id={'appearance-font-family'}>
                  {t('settingAppearance.font.fontFamily.title')}
                </SettingsSearchAnchor>
              ),
              minWidth: undefined,
            },
            {
              children: (
                <FallbackFontList
                  ariaLabel={t('settingAppearance.font.fallback.title')}
                  loading={interfaceFonts.isLoading}
                  needPrimaryHint={t('settingAppearance.font.fallback.needPrimary')}
                  options={interfaceFonts.options}
                  stack={interfaceStack}
                  onChange={saveInterfaceStack}
                />
              ),
              desc: t('settingAppearance.font.fallback.desc'),
              label: (
                <SettingsSearchAnchor id={'appearance-font-fallback'}>
                  {t('settingAppearance.font.fallback.title')}
                </SettingsSearchAnchor>
              ),
              minWidth: undefined,
            },
            {
              children: (
                <Select
                  showSearch
                  aria-label={t('settingAppearance.font.monospace.title')}
                  loading={monospaceFonts.isLoading}
                  options={monospaceFonts.options}
                  style={{ width: 320 }}
                  value={monospaceStack[0] || APPLICATION_DEFAULT_FONT}
                  onChange={(value: string) =>
                    saveMonospaceStack(
                      value === APPLICATION_DEFAULT_FONT ? [] : [value, ...monospaceStack.slice(1)],
                    )
                  }
                />
              ),
              desc: monospaceFonts.hasLoadError
                ? t('settingAppearance.font.monospace.loadError')
                : t('settingAppearance.font.monospace.desc'),
              label: (
                <SettingsSearchAnchor id={'appearance-monospace-font'}>
                  {t('settingAppearance.font.monospace.title')}
                </SettingsSearchAnchor>
              ),
              minWidth: undefined,
            },
            {
              children: (
                <FallbackFontList
                  ariaLabel={t('settingAppearance.font.monospaceFallback.title')}
                  loading={monospaceFonts.isLoading}
                  needPrimaryHint={t('settingAppearance.font.monospaceFallback.needPrimary')}
                  options={monospaceFonts.options}
                  stack={monospaceStack}
                  onChange={saveMonospaceStack}
                />
              ),
              desc: t('settingAppearance.font.monospaceFallback.desc'),
              label: (
                <SettingsSearchAnchor id={'appearance-monospace-font-fallback'}>
                  {t('settingAppearance.font.monospaceFallback.title')}
                </SettingsSearchAnchor>
              ),
              minWidth: undefined,
            },
          ]
        : []),
      {
        children: (
          <Switch
            checked={fontAntialiasing}
            onChange={(checked) =>
              save(() => setSettings({ general: { fontAntialiasing: checked } }))
            }
          />
        ),
        desc: t('settingAppearance.font.antialiasing.desc'),
        label: (
          <SettingsSearchAnchor id={'appearance-font-antialiasing'}>
            {t('settingAppearance.font.antialiasing.title')}
          </SettingsSearchAnchor>
        ),
        minWidth: undefined,
      },
    ],
    extra: <AutoSaveHint lastUpdatedTime={lastSavedAt} saveStatus={saveStatus} onRetry={retry} />,
    // The sub page header already reads "Font".
    title: null,
  };

  return (
    <SettingsForm
      collapsible={false}
      form={form}
      items={[fontSizeGroup, font]}
      itemsType={'group'}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

export default FontSettings;
