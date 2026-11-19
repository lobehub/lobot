'use client';

import { BRANDING_NAME } from '@lobechat/business-const';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { useTranslation } from 'react-i18next';

import { useUserStore } from '@/store/user';
import { userGeneralSettingsSelectors } from '@/store/user/selectors';

const styles = stylex.create({
  bubble: {
    maxWidth: '72%',
    paddingBlock: '6px',
    paddingInline: '12px',
    borderRadius: '16px',
    lineHeight: 1.5,
  },
  incoming: {
    alignSelf: 'flex-start',
    borderEndStartRadius: '4px',
    color: cssVar.colorText,
    backgroundColor: cssVar.colorFillTertiary,
    backgroundImage: 'none',
  },
  name: {
    fontWeight: 500,
    color: cssVar.colorPrimary,
  },
  outgoing: {
    alignSelf: 'flex-end',
    borderEndEndRadius: '4px',
    color: cssVar.colorText,
    backgroundColor: cssVar.colorPrimaryBg,
    backgroundImage: 'none',
  },
  fontSize: (fontSize: number) => ({ fontSize }),
  stage: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingBlock: '8px',
  },
});

/**
 * A short conversation drawn with the live accent and text size, shown next to
 * the typography controls so size changes are visible immediately.
 */
const ChatThemePreview = () => {
  const { t } = useTranslation('setting');
  const fontSize = useUserStore(userGeneralSettingsSelectors.fontSize);

  return (
    <div aria-hidden {...stylex.props(styles.stage, styles.fontSize(fontSize))}>
      <div {...stylex.props(styles.bubble, styles.incoming)}>
        <div {...stylex.props(styles.name)}>{BRANDING_NAME}</div>
        {t('settingAppearance.preview.agentMessage')}
      </div>
      <div {...stylex.props(styles.bubble, styles.outgoing)}>
        {t('settingAppearance.preview.userMessage')}
      </div>
      <div {...stylex.props(styles.bubble, styles.incoming)}>
        {t('settingAppearance.preview.agentReply')}
      </div>
    </div>
  );
};

export default ChatThemePreview;
