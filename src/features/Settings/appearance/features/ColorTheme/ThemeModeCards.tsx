'use client';

import { type LobeAppearance, ThemeScope } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { useTheme as useNextThemesTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

import { SETTINGS_ANCHOR_ROW_ATTR, SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { useUserStore } from '@/store/user';
import { userGeneralSettingsSelectors } from '@/store/user/selectors';

type ThemeMode = 'dark' | 'light' | 'system';

const styles = stylex.create({
  bubbleIn: {
    width: '64%',
    height: '12px',
    borderRadius: '6px',
    backgroundColor: cssVar.colorFillSecondary,
    backgroundImage: 'none',
  },
  bubbleOut: {
    alignSelf: 'flex-end',
    width: '52%',
    height: '12px',
    borderRadius: '6px',
    backgroundColor: cssVar.colorPrimary,
    backgroundImage: 'none',
  },
  card: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
    padding: 0,
    borderWidth: 0,
    color: cssVar.colorText,
    backgroundColor: 'transparent',
    backgroundImage: 'none',
  },
  frame: {
    overflow: 'hidden',
    display: 'flex',
    width: '96px',
    height: '64px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: cssVar.colorBorderSecondary,
    borderRadius: '12px',
  },
  frameActive: { borderColor: cssVar.colorPrimary },
  label: { fontSize: '13px', lineHeight: '18px' },
  labelActive: { color: cssVar.colorPrimary },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    paddingBlock: '8px',
    paddingInline: 0,
  },
  scope: { display: 'flex', flex: '1', minWidth: 0 },
  surface: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: '6px',
    justifyContent: 'center',
    paddingInline: '8px',
    backgroundColor: cssVar.colorBgLayout,
    backgroundImage: 'none',
  },
});

/** A tiny chat drawn in `appearance`'s own tokens, whatever theme the app currently uses. */
const ThemeSurface = ({ appearance }: { appearance: LobeAppearance }) => {
  const primaryColor = useUserStore(userGeneralSettingsSelectors.primaryColor);

  return (
    <ThemeScope
      appearance={appearance}
      className={stylex.props(styles.scope).className}
      primaryColor={primaryColor || undefined}
    >
      <span {...stylex.props(styles.surface)}>
        <span {...stylex.props(styles.bubbleIn)} />
        <span {...stylex.props(styles.bubbleOut)} />
      </span>
    </ThemeScope>
  );
};

/** Light, dark or follow the system: Telegram's theme cards, each drawn in its own colors. */
const ThemeModeCards = () => {
  const { t } = useTranslation('setting');
  const { theme, setTheme } = useNextThemesTheme();
  const current: ThemeMode = theme === 'light' || theme === 'dark' ? theme : 'system';

  const modes: { label: string; value: ThemeMode }[] = [
    { label: t('settingCommon.themeMode.light'), value: 'light' },
    { label: t('settingCommon.themeMode.dark'), value: 'dark' },
    { label: t('settingCommon.lang.autoMode'), value: 'system' },
  ];

  return (
    <div
      aria-label={t('settingCommon.themeMode.title')}
      role={'radiogroup'}
      {...stylex.props(styles.row)}
      {...{ [SETTINGS_ANCHOR_ROW_ATTR]: '' }}
    >
      <SettingsSearchAnchor id={'appearance-theme-mode'}>{null}</SettingsSearchAnchor>
      {modes.map(({ label, value }) => {
        const active = current === value;
        return (
          <button
            aria-checked={active}
            key={value}
            role={'radio'}
            type={'button'}
            {...stylex.props(styles.card)}
            onClick={() => setTheme(value)}
          >
            <span {...stylex.props(styles.frame, active && styles.frameActive)}>
              {/* Following the system shows both halves: light on the left, dark on the right. */}
              {value !== 'dark' && <ThemeSurface appearance={'light'} />}
              {value !== 'light' && <ThemeSurface appearance={'dark'} />}
            </span>
            <span {...stylex.props(styles.label, active && styles.labelActive)}>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeModeCards;
