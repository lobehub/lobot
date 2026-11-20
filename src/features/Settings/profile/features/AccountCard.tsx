'use client';

import { isDesktop } from '@lobechat/const';
import { Button, copyToClipboard, Flexbox, Icon, Text, toast, Upload } from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { CopyIcon, Loader2Icon, PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import urlJoin from 'url-join';

import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import UserAvatar from '@/features/User/UserAvatar';
import { useAppOrigin } from '@/hooks/useAppOrigin';
import { useSignOut } from '@/hooks/useSignOut';
import { electronSystemService } from '@/services/electron/system';
import { useUserStore } from '@/store/user';
import { authSelectors, userProfileSelectors } from '@/store/user/selectors';
import { saveToast } from '@/store/utils/saveToast';
import { sx } from '@/styles/sx';
import { imageToBase64 } from '@/utils/imageToBase64';
import { createUploadImageHandler } from '@/utils/uploadFIle';

import { formatAccountUserId } from './accountUserId';
import { avatarHover } from './markers.stylex';

const styles = stylex.create({
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginInlineStart: 'auto',
  },
  avatarButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    marginBlock: 0,
    marginInline: 0,
    paddingBlock: 0,
    paddingInline: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    color: cssVar.colorTextLightSolid,
    cursor: 'pointer',
    outline: { 'default': 'none', ':focus-visible': `2px solid ${cssVar.colorPrimary}` },
    outlineOffset: '2px',
  },
  caption: {
    paddingInline: '2px',
  },
  copy: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: 0,
    maxWidth: '100%',
    marginBlock: 0,
    marginInline: 0,
    paddingBlock: 0,
    paddingInline: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    color: cssVar.colorTextSecondary,
    font: 'inherit',
    fontSize: '12px',
    lineHeight: 1.4,
    textAlign: 'start',
    cursor: 'pointer',
  },
  copyText: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  identity: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    gap: '2px',
    minWidth: '120px',
  },
  mask: {
    position: 'absolute',
    insetBlock: 0,
    insetInline: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: cssVar.colorBgMask,
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', avatarHover)]: 1,
      [stylex.when.ancestor(':focus-visible', avatarHover)]: 1,
    },
    pointerEvents: 'none',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
    paddingBlock: '12px',
    paddingInline: '16px',
  },
});

/**
 * One account card: who is signed in, a local avatar upload, a jump out to edit
 * the rest of the profile on the web, and sign out.
 */
const AccountCard = () => {
  const { t } = useTranslation(['auth', 'common']);
  const signOut = useSignOut();
  const appOrigin = useAppOrigin();
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isLogin, nickName, username, updateAvatar] = useUserStore((s) => [
    authSelectors.isLogin(s),
    userProfileSelectors.nickName(s),
    userProfileSelectors.username(s),
    s.updateAvatar,
  ]);

  const description = formatAccountUserId(isLogin === true, username);

  async function saveAvatar(avatar: string) {
    try {
      setUploadingAvatar(true);
      const img = new Image();
      img.src = avatar;
      await new Promise((resolve, reject) => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', reject);
      });
      await updateAvatar(imageToBase64({ img, size: 256 }));
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      saveToast(error, {
        retry: () => void saveAvatar(avatar),
        title: t('profile.avatarUploadError'),
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  const handleUploadAvatar = createUploadImageHandler(saveAvatar);

  const openEditor = () => {
    if (!appOrigin) return;
    const url = urlJoin(appOrigin, '/settings/profile');
    if (isDesktop) {
      void electronSystemService.openExternalLink(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyDescription = async () => {
    if (!description) return;
    try {
      await copyToClipboard(description);
      toast.success(t('copySuccess', { ns: 'common' }));
    } catch {
      toast.error(t('copyFail', { ns: 'common' }));
    }
  };

  return (
    <Flexbox gap={6}>
      <div {...stylex.props(styles.caption)}>
        <Text fontSize={12} type={'secondary'} weight={500}>
          {t('profile.account')}
        </Text>
      </div>
      <Surface padded={false} style={{ minWidth: 0 }}>
        <div {...stylex.props(styles.row)}>
          {isLogin ? (
            <Upload
              accept={'image/*'}
              aria-label={t('profile.updateAvatar')}
              disabled={uploadingAvatar}
              maxCount={1}
              {...stylex.props(avatarHover)}
              onFiles={([file]) => {
                if (file) handleUploadAvatar(file);
              }}
            >
              <div {...stylex.props(styles.avatarButton)}>
                <UserAvatar shape={'circle'} size={40} />
                <span {...sx(styles.mask, uploadingAvatar && { opacity: 1 })}>
                  <Icon
                    color={cssVar.colorTextLightSolid}
                    icon={uploadingAvatar ? Loader2Icon : PencilIcon}
                    size={uploadingAvatar ? 16 : 14}
                    spin={uploadingAvatar}
                  />
                </span>
              </div>
            </Upload>
          ) : (
            <UserAvatar shape={'circle'} size={40} />
          )}
          <div {...stylex.props(styles.identity)}>
            <Text ellipsis fontSize={14} weight={500}>
              {nickName}
            </Text>
            {description && (
              <button
                aria-label={`${description}, ${t('copy', { ns: 'common' })}`}
                type={'button'}
                {...stylex.props(styles.copy)}
                onClick={() => void copyDescription()}
              >
                <span {...stylex.props(styles.copyText)}>{description}</span>
                <Icon icon={CopyIcon} size={12} />
              </button>
            )}
          </div>
          {isLogin && (
            <div {...stylex.props(styles.actions)}>
              <SettingsSearchAnchor id={'profile-email'}>
                <Button disabled={!appOrigin} shape={'round'} type={'fill'} onClick={openEditor}>
                  {t('edit', { ns: 'common' })}
                </Button>
              </SettingsSearchAnchor>
              <Button
                loading={signingOut}
                shape={'round'}
                type={'fill'}
                onClick={async () => {
                  setSigningOut(true);
                  try {
                    await signOut();
                  } finally {
                    setSigningOut(false);
                  }
                }}
              >
                {t('signout')}
              </Button>
            </div>
          )}
        </div>
      </Surface>
    </Flexbox>
  );
};

export default AccountCard;
