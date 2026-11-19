'use client';

import { Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SETTINGS_ANCHOR_ROW_ATTR, SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { useSignOut } from '@/hooks/useSignOut';

const styles = stylex.create({
  row: {
    cursor: { 'default': 'pointer', ':disabled': 'default' },
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    boxSizing: 'border-box',
    // The card insets its body by 16px. Bleed back to the card edges so the
    // hover fill is the whole row, while the label stays in line with the fields.
    width: 'calc(100% + 32px)',
    marginInline: '-16px',
    minHeight: '48px',
    paddingBlock: '8px',
    paddingInline: '16px',
    borderWidth: 0,
    fontFamily: 'inherit',
    fontSize: cssVar.fontSize,
    color: cssVar.colorError,
    textAlign: 'start',
    backgroundColor: { 'default': 'transparent', ':hover': cssVar.colorFillQuaternary },
    backgroundImage: 'none',
    transition: `background-color ${cssVar.motionDurationMid} ease`,
  },
});

/**
 * Telegram's sign-out: a plain red row at the bottom of the profile, not a
 * button competing with the fields above.
 */
const SignOutRow = () => {
  const { t } = useTranslation('auth');
  const signOut = useSignOut();
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      type={'button'}
      {...stylex.props(styles.row)}
      {...{ [SETTINGS_ANCHOR_ROW_ATTR]: '' }}
      onClick={async () => {
        setLoading(true);
        try {
          await signOut();
        } finally {
          setLoading(false);
        }
      }}
    >
      <SettingsSearchAnchor id={'profile-sign-out'}>{t('signout')}</SettingsSearchAnchor>
      {loading && <Icon spin icon={Loader2Icon} size={14} />}
    </button>
  );
};

export default SignOutRow;
