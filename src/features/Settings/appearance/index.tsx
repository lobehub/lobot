'use client';

import { isDesktop } from '@lobechat/const';
import { Segmented, Select, Switch } from '@lobehub/ui';
import { Form, type FormGroupItem, useForm } from '@lobehub/ui/form';
import { useTheme as useNextThemesTheme } from 'next-themes';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceStore } from '@/business/client/workspace/store';
import AppearanceSkeleton from '@/components/Skeleton/Settings/tabs/Appearance';
import { FORM_STYLE } from '@/const/layoutTokens';
import FormNavField from '@/features/Settings/features/FormNavField';
import SettingHeader from '@/features/Settings/features/SettingHeader';
import SettingsForm, { SettingsSurfaceGroup } from '@/features/Settings/features/SettingsForm';
import { getSettingsSubPageUrl } from '@/features/Settings/features/subPageUrl';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { localeOptions } from '@/locales/resources';
import { useGlobalStore } from '@/store/global';
import { SettingsTabs } from '@/store/global/initialState';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useUserStore } from '@/store/user';
import { userGeneralSettingsSelectors } from '@/store/user/selectors';
import { type LocaleMode } from '@/types/locale';

import AccentSwatches from './features/ColorTheme/AccentSwatches';
import ChatThemePreview from './features/ColorTheme/ChatThemePreview';
import AppTraySwitch from './features/Desktop';
import { FontSizeControl } from './features/Font/FontSize';

interface PageProps {
  showSettingHeader?: boolean;
}

const SELECT_STYLE = { minWidth: 140 };

const Page = ({ showSettingHeader = true }: PageProps) => {
  const { t } = useTranslation('setting');
  const isUserStateInit = useUserStore((s) => s.isUserStateInit);
  const fontSize = useUserStore(userGeneralSettingsSelectors.fontSize);
  const animationMode = useUserStore(userGeneralSettingsSelectors.animationMode);
  const showWorkspaceRail = useUserStore(userGeneralSettingsSelectors.showWorkspaceRail);
  const workspaceRailOffered = useWorkspaceStore((s) => s.isWorkspaceAvailable);
  const responseLanguage = useUserStore(userGeneralSettingsSelectors.responseLanguage);
  const setSettings = useUserStore((s) => s.setSettings);
  const language = useGlobalStore(systemStatusSelectors.language);
  const switchLocale = useGlobalStore((s) => s.switchLocale);
  const { theme, setTheme } = useNextThemesTheme();
  const form = useForm();

  const themeMode = theme === 'light' || theme === 'dark' ? theme : 'system';

  const languageOptions = useMemo(
    () => [{ label: t('settingCommon.lang.autoMode'), value: 'auto' }, ...localeOptions],
    [t],
  );

  const header = showSettingHeader && <SettingHeader title={t('tab.appearance')} />;

  if (!isUserStateInit)
    return (
      <>
        {header}
        <AppearanceSkeleton.Body />
      </>
    );

  const items: FormGroupItem[] = [
    {
      children: [
        {
          children: (
            <Select
              style={SELECT_STYLE}
              value={themeMode}
              options={[
                { label: t('settingCommon.themeMode.auto'), value: 'system' },
                { label: t('settingCommon.themeMode.light'), value: 'light' },
                { label: t('settingCommon.themeMode.dark'), value: 'dark' },
              ]}
              onChange={(value) => setTheme(value)}
            />
          ),
          label: (
            <SettingsSearchAnchor id={'appearance-theme-mode'}>
              {t('settingCommon.themeMode.title')}
            </SettingsSearchAnchor>
          ),
          minWidth: undefined,
        },
        {
          children: <AccentSwatches />,
          divider: true,
          label: (
            <SettingsSearchAnchor id={'appearance-primary-color'}>
              {t('settingAppearance.primaryColor.title')}
            </SettingsSearchAnchor>
          ),
          minWidth: undefined,
        },
        {
          children: (
            <Select
              options={languageOptions}
              style={SELECT_STYLE}
              value={language}
              onChange={(value) => switchLocale((value ?? 'auto') as LocaleMode)}
            />
          ),
          divider: true,
          label: (
            <SettingsSearchAnchor id={'language-interface'}>
              {t('settingCommon.lang.interfaceTitle')}
            </SettingsSearchAnchor>
          ),
          minWidth: undefined,
        },
        {
          children: (
            <Select
              allowClear
              aria-label={t('settingCommon.responseLanguage.title')}
              options={localeOptions}
              placeholder={t('settingCommon.responseLanguage.placeholder')}
              style={SELECT_STYLE}
              value={responseLanguage || undefined}
              onChange={(value) => setSettings({ general: { responseLanguage: value ?? '' } })}
            />
          ),
          desc: t('settingCommon.responseLanguage.desc'),
          divider: true,
          label: (
            <SettingsSearchAnchor id={'language-response-language'}>
              {t('settingCommon.responseLanguage.title')}
            </SettingsSearchAnchor>
          ),
          minWidth: undefined,
        },
      ],
      title: t('group.common'),
    },
    {
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
    },
  ];

  return (
    <>
      {header}
      <SettingsForm
        collapsible={false}
        form={form}
        items={items}
        itemsType={'group'}
        variant={'borderless'}
        {...FORM_STYLE}
      >
        <SettingsSurfaceGroup title={t('settingAppearance.display.title')}>
          <FormNavField
            label={t('settingAppearance.font.title')}
            to={getSettingsSubPageUrl(SettingsTabs.Appearance, 'font')}
          />
          <FormNavField
            divider
            label={t('settingAppearance.chatDisplay.title')}
            to={getSettingsSubPageUrl(SettingsTabs.Appearance, 'chat')}
          />
          <Form.Field
            divider
            minWidth={undefined}
            label={
              <SettingsSearchAnchor id={'appearance-animation'}>
                {t('settingAppearance.animationMode.title')}
              </SettingsSearchAnchor>
            }
          >
            <Segmented
              value={animationMode}
              options={[
                { label: t('settingAppearance.animationMode.disabled'), value: 'disabled' },
                { label: t('settingAppearance.animationMode.agile'), value: 'agile' },
                { label: t('settingAppearance.animationMode.elegant'), value: 'elegant' },
              ]}
              onChange={(value) => setSettings({ general: { animationMode: value } })}
            />
          </Form.Field>
          {workspaceRailOffered && (
            <Form.Field
              divider
              desc={t('settingAppearance.workspaceRail.desc')}
              minWidth={undefined}
              label={
                <SettingsSearchAnchor id={'appearance-workspace-rail'}>
                  {t('settingAppearance.workspaceRail.title')}
                </SettingsSearchAnchor>
              }
            >
              <Switch
                aria-label={t('settingAppearance.workspaceRail.title')}
                checked={showWorkspaceRail}
                onChange={(checked) => setSettings({ general: { showWorkspaceRail: checked } })}
              />
            </Form.Field>
          )}
          {isDesktop && (
            <Form.Field
              divider
              minWidth={undefined}
              label={
                <SettingsSearchAnchor id={'appearance-app-tray'}>
                  {t('settingAppearance.appTray.title')}
                </SettingsSearchAnchor>
              }
            >
              <AppTraySwitch />
            </Form.Field>
          )}
        </SettingsSurfaceGroup>
      </SettingsForm>
    </>
  );
};

export default Page;
