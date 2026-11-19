'use client';

import {
  Flexbox,
  isCustomPrimaryColor,
  type LobePrimaryColor,
  type PrimaryColors,
  primaryColors,
  Select,
} from '@lobehub/ui';
import { useTranslation } from 'react-i18next';

import { useUserStore } from '@/store/user';
import { userGeneralSettingsSelectors } from '@/store/user/selectors';

const COLOR_KEYS = [
  'red',
  'orange',
  'gold',
  'yellow',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
  'magenta',
  'volcano',
] as const satisfies readonly PrimaryColors[];

const DEFAULT_VALUE = 'default';

const Swatch = ({ color }: { color?: string }) => (
  <span
    style={{
      background:
        color ??
        'conic-gradient(from 90deg, #999 0 25%, transparent 0 50%, #999 0 75%, transparent 0)',
      backgroundColor: color ?? '#fff',
      border: '1px solid color-mix(in srgb, var(--lobe-color-text) 12%, transparent)',
      borderRadius: '50%',
      flex: 'none',
      height: 12,
      width: 12,
    }}
  />
);

/** Accent color as a compact select, saved as soon as an option is picked. */
const AccentSwatches = () => {
  const { t } = useTranslation('color');
  const value = useUserStore(userGeneralSettingsSelectors.primaryColor);
  const setSettings = useUserStore((s) => s.setSettings);

  const isCustom = Boolean(value && isCustomPrimaryColor(value));
  const selectValue = !value ? DEFAULT_VALUE : value;

  const options = [
    {
      label: (
        <Flexbox horizontal align={'center'} gap={8}>
          <Swatch />
          {t('default')}
        </Flexbox>
      ),
      value: DEFAULT_VALUE,
    },
    ...COLOR_KEYS.map((key) => ({
      label: (
        <Flexbox horizontal align={'center'} gap={8}>
          <Swatch color={primaryColors[key]} />
          {t(key)}
        </Flexbox>
      ),
      value: key,
    })),
    ...(isCustom
      ? [
          {
            label: (
              <Flexbox horizontal align={'center'} gap={8}>
                <Swatch color={value} />
                {t('custom')}
              </Flexbox>
            ),
            value: value as string,
          },
        ]
      : []),
  ];

  return (
    <Select
      options={options}
      style={{ minWidth: 140 }}
      value={selectValue}
      onChange={(next) =>
        setSettings({
          general: { primaryColor: (next === DEFAULT_VALUE ? '' : next) as LobePrimaryColor },
        })
      }
    />
  );
};

export default AccentSwatches;
