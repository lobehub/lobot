'use client';

import { isDesktop } from '@lobechat/const';
import { Flexbox } from '@lobehub/ui';

import { SettingsSurfaceGroup } from '@/features/Settings/features/SettingsForm';

import SkeletonBar from '../../Bar';
import { SettingsFormSkeleton, SWITCH_CONTROL } from '../Section';
import { useSkeletonText } from '../useSkeletonText';
import type { SettingsTabSkeleton, SettingsTabSkeletonProps } from './types';

/** The idle auto-save hint ("loaded the latest version") on the right of a group head. */
const SAVE_HINT = <SkeletonBar height={20} width={102} />;

export const FontSectionSkeleton = () => {
  const text = useSkeletonText('setting');
  const fontRow = (key: string) => ({
    control: { height: 32, width: 320 },
    desc: text(`settingAppearance.font.${key}.desc`, 240, 12),
    label: text(`settingAppearance.font.${key}.title`, 96, 14),
    minWidth: undefined,
  });

  return (
    <SettingsFormSkeleton
      groups={[
        {
          extra: SAVE_HINT,
          items: [
            ...(isDesktop
              ? ['fontFamily', 'fallback', 'monospace', 'monospaceFallback'].map(fontRow)
              : []),
            {
              control: SWITCH_CONTROL,
              desc: text('settingAppearance.font.antialiasing.desc', 360, 12),
              label: text('settingAppearance.font.antialiasing.title', 72, 14),
              minWidth: undefined,
            },
          ],
          title: text('settingAppearance.font.title', 32),
        },
      ]}
    />
  );
};

/**
 * Chat appearance: four separate blocks (36px apart in the settings container):
 * transition preview, chat-behaviour switches, code and Mermaid theme previews.
 */
export const ChatAppearanceSectionSkeleton = () => {
  const text = useSkeletonText('setting');

  return (
    <Flexbox gap={20} width={'100%'}>
      <SettingsSurfaceGroup
        extra={<SkeletonBar height={38} radius={8} width={151} />}
        title={text('settingChatAppearance.transitionMode.title', 64)}
      >
        <SkeletonBar height={182} radius={8} />
      </SettingsSurfaceGroup>
      <SettingsFormSkeleton
        groups={[
          {
            items: [
              {
                control: SWITCH_CONTROL,
                label: text('settingChatAppearance.autoScrollOnStreaming.title', 120, 14),
                minWidth: undefined,
              },
              {
                control: SWITCH_CONTROL,
                label: text('settingChatAppearance.workflowStreamingExpand.title', 120, 14),
                minWidth: undefined,
              },
              {
                control: SWITCH_CONTROL,
                // The loaded description is a two-line link preview.
                desc: (
                  <Flexbox gap={6} paddingBlock={4}>
                    <SkeletonBar height={14} width={160} />
                    <SkeletonBar height={14} width={200} />
                  </Flexbox>
                ),
                label: text('settingChatAppearance.linkIcon.title', 120, 14),
                minWidth: undefined,
              },
              {
                control: SWITCH_CONTROL,
                desc: text('settingChatAppearance.pasteAutoConvert.desc', 360, 12),
                label: text('settingChatAppearance.pasteAutoConvert.title', 120, 14),
                minWidth: undefined,
              },
            ],
            title: text('settingChatAppearance.chatBehavior.title', 64),
          },
        ]}
      />
      <SettingsSurfaceGroup
        extra={<SkeletonBar height={32} width={240} />}
        title={text('settingChatAppearance.highlighterTheme.title', 96)}
      >
        <SkeletonBar height={167} radius={8} />
      </SettingsSurfaceGroup>
      <SettingsSurfaceGroup
        extra={<SkeletonBar height={32} width={240} />}
        title={text('settingChatAppearance.mermaidTheme.title', 96)}
      >
        <SkeletonBar height={295} radius={8} />
      </SettingsSurfaceGroup>
    </Flexbox>
  );
};

/** A settings select, the same 32×140 control the appearance rows use. */
const SELECT = { height: 32, width: 140 };

/**
 * The appearance tab: common selects (theme, accent, languages), the message
 * preview with the font-size slider, then the display rows.
 */
const AppearanceBody = () => {
  const text = useSkeletonText('setting');
  const select = (key: string, width: number) => ({
    control: SELECT,
    label: text(key, width, 14),
    minWidth: undefined as undefined,
  });

  return (
    <Flexbox aria-busy gap={20}>
      <SettingsFormSkeleton
        groups={[
          {
            items: [
              select('settingCommon.themeMode.title', 64),
              { ...select('settingAppearance.primaryColor.title', 56), divider: true },
              { ...select('settingCommon.lang.interfaceTitle', 72), divider: true },
              {
                ...select('settingCommon.responseLanguage.title', 72),
                desc: text('settingCommon.responseLanguage.desc', 240, 12),
                divider: true,
              },
            ],
            title: text('group.common', 32, 18),
          },
        ]}
      />
      <SettingsSurfaceGroup title={text('settingChatAppearance.fontSize.title', 56, 18)}>
        <Flexbox gap={12} paddingBlock={8}>
          <SkeletonBar height={120} radius={8} />
          <SkeletonBar height={28} />
        </Flexbox>
      </SettingsSurfaceGroup>
      <SettingsFormSkeleton
        groups={[
          {
            items: [
              {
                control: { height: 16, width: 16 },
                label: text('settingAppearance.font.title', 32, 14),
                minWidth: undefined,
              },
              {
                control: { height: 16, width: 16 },
                divider: true,
                label: text('settingAppearance.chatDisplay.title', 64, 14),
                minWidth: undefined,
              },
              {
                control: { height: 32, width: 200 },
                divider: true,
                label: text('settingAppearance.animationMode.title', 64, 14),
                minWidth: undefined,
              },
              ...(isDesktop
                ? [
                    {
                      control: SWITCH_CONTROL,
                      divider: true,
                      label: text('settingAppearance.appTray.title', 96, 14),
                      minWidth: undefined,
                    },
                  ]
                : []),
            ],
            title: text('settingAppearance.display.title', 32, 18),
          },
        ]}
      />
    </Flexbox>
  );
};

const Body = ({ sub }: SettingsTabSkeletonProps) => {
  if (sub === 'font') return <FontSectionSkeleton />;
  if (sub === 'chat') return <ChatAppearanceSectionSkeleton />;
  return <AppearanceBody />;
};

const AppearanceSkeleton: SettingsTabSkeleton = { Body };

export default AppearanceSkeleton;
